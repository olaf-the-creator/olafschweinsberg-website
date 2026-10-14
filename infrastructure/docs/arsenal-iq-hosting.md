# arsenal-iq hosting

`https://www.olafschweinsberg.com/arsenal-iq/` serves a separate Vue SPA (repo: `~/projects/bpe/poc`)
from the same CloudFront distribution as the React site at `/`.

## Architecture
- Distribution `SiteDistribution` has two origins, both private S3 buckets reached via OAC:
  - default behavior -> `olafschweinsberg-website-assets` (React)
  - `/arsenal-iq` and `/arsenal-iq/*` -> `olafschweinsberg-arsenal-iq-assets` (Vue)
- Behaviors are exact patterns, not `/arsenal-iq*`, so `/arsenal-iqfoo` falls through to React.
- **Key prefix:** CloudFront forwards the full path to the origin, so Vue objects must be uploaded
  under `arsenal-iq/` (e.g. `arsenal-iq/index.html`), never at the bucket root.
- The two buckets are independent, so the React `BucketDeployment` (`prune: true`) can never delete
  Vue files, and its `/*` invalidation is unaffected.

## Routing and error handling
There are **no `errorResponses`**. An error response that rewrites to `index.html` would serve the
React shell for Vue deep links and return it with an error status. Instead, the viewer-request function
`lib/functions/spa-router.js` runs on every behavior:
- apex -> `www` 301 redirect
- `/arsenal-iq` -> `/arsenal-iq/` 301 (query string preserved)
- extensionless paths under `/arsenal-iq/` -> `/arsenal-iq/index.html`; all other extensionless paths -> `/index.html`
  (real 200s, because the rewritten object exists)
- anything with a file extension is untouched
- Both buckets grant `s3:ListBucket` to CloudFront (scoped to this distribution), so a missing file is a
  real 404 instead of S3's 403.

A mistyped route such as `/no-such-page` returns 200 with the React shell; the app decides what to show.

The Vue app uses history mode (`createWebHistory(import.meta.env.BASE_URL)`) with `base: '/arsenal-iq/'`, so
deep links look like `/arsenal-iq/pitchers/27473`. The server sees these paths, so the rewrite above is required,
not a safety net: it is what makes a deep link or refresh return the Vue `index.html` with a 200. The app has a
catch-all route that renders its own not-found page, so an unknown route such as `/arsenal-iq/no-such-page`
returns 200 with the Vue shell and the app shows "Page not found". Missing files (anything with an extension)
are still real 404s. Deploy with `poc/scripts/deploy.sh` in the bpe repo.

## Cache metadata (set when uploading)
- `arsenal-iq/index.html` -> `Cache-Control: no-cache`
- `arsenal-iq/assets/*` (hashed) -> `public, max-age=31536000, immutable`
- Everything else (e.g. `team-logos/`) -> shorter, e.g. `public, max-age=3600`

The cache policy (`CachingOptimized`) honors origin Cache-Control.

## SSM parameters / outputs
- `/olafschweinsberg/arsenal-iq/bucket-name`
- `/olafschweinsberg/arsenal-iq/distribution-id`
Also CfnOutputs `ArsenalIqBucketName` and `ArsenalIqDistributionId`.

## Deploying the Vue app (local, no CI)
```sh
cd ~/projects/bpe/poc && npm run build
BUCKET=$(aws ssm get-parameter --name /olafschweinsberg/arsenal-iq/bucket-name --query Parameter.Value --output text)
DIST=$(aws ssm get-parameter --name /olafschweinsberg/arsenal-iq/distribution-id --query Parameter.Value --output text)
aws s3 sync dist "s3://$BUCKET/arsenal-iq/" --delete --exclude index.html --exclude 'assets/*' --cache-control "public, max-age=3600"
aws s3 sync dist/assets "s3://$BUCKET/arsenal-iq/assets/" --delete --cache-control "public, max-age=31536000, immutable"
aws s3 cp dist/index.html "s3://$BUCKET/arsenal-iq/index.html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/arsenal-iq/index.html" "/arsenal-iq/"
```
`--delete` is scoped to the `arsenal-iq/` prefix. If a CI is added later, create a role with
`s3:ListBucket` (prefix `arsenal-iq/*`), `s3:PutObject`/`s3:DeleteObject` on `arsenal-iq/*`,
`cloudfront:CreateInvalidation` and `ssm:GetParameter` on the two parameters.

## Headers
Both behaviors use the managed `SECURITY_HEADERS` policy, which sets no CSP, so Google Fonts or CDNs are not
blocked. It sets `X-Frame-Options: DENY`. (The Vue app bundles Montserrat via `@fontsource`.)

## Post-deploy smoke tests
```sh
curl -sI https://www.olafschweinsberg.com/                       # 200 text/html (React)
curl -sI https://www.olafschweinsberg.com/about                  # 200 text/html (React shell)
curl -sI https://www.olafschweinsberg.com/no-such-page           # 200 text/html (React shell)
curl -sI https://www.olafschweinsberg.com/assets/nope.js         # 404, not 403
curl -sI https://www.olafschweinsberg.com/arsenal-iq             # 301, location: /arsenal-iq/
curl -s  https://www.olafschweinsberg.com/arsenal-iq/ | grep -i '<title>'   # Vue index.html
curl -sI https://www.olafschweinsberg.com/arsenal-iq/pitchers/27473 # 200 text/html (Vue shell, deep link)
curl -sI https://www.olafschweinsberg.com/arsenal-iq/no-such-page   # 200 text/html (Vue shell, app shows not-found)
curl -sI https://www.olafschweinsberg.com/arsenal-iq/assets/<hashed-file>  # 200, cache-control: ...immutable
curl -sI https://www.olafschweinsberg.com/arsenal-iq/assets/nope.js        # 404
```
The arsenal-iq checks only pass after the first upload.
