# Infrastructure

CDK app for olafschweinsberg.com (S3 + CloudFront + Route53).

## Deploy the website

```sh
cd ../website && npm run build     # build the React app
cd ../infrastructure && npx cdk deploy
```

`cdk deploy` uploads `../website/build` to S3 and invalidates the CloudFront cache. Run `npx cdk diff` first to preview.

The Arsenal IQ app is deployed separately: see `docs/arsenal-iq-hosting.md`.
