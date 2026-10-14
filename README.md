# olafschweinsberg.com

Source for my personal website, built as a living resume: the site presents my work, and the way it's built and deployed shows how I work.

- **`website/`**: React 18 + TypeScript single-page app (Create React App).
- **`infrastructure/`**: AWS CDK v2 (TypeScript) stack that hosts it: private S3 buckets, CloudFront with Origin Access Control and security headers, ACM certificate, Route 53 DNS, and a CloudFront Function for the apex-to-www redirect and SPA routing. It also serves my separate Arsenal IQ app under `/arsenal-iq`.

## Run locally

Requires Node.js 18+.

```sh
cd website
npm install
npm start        # http://localhost:3000
```

## Deploy

Requires an AWS account with CDK bootstrapped and a Route 53 hosted zone for your domain. Update the account and domain in `infrastructure/bin/infrastructure.ts`.

```sh
cd website && npm run build
cd ../infrastructure && npm install
npx cdk diff     # preview
npx cdk deploy   # upload build, invalidate CloudFront cache
```

Infrastructure tests: `cd infrastructure && npm test`. Arsenal IQ hosting is covered in `infrastructure/docs/arsenal-iq-hosting.md`.

## License

[MIT](LICENSE)
