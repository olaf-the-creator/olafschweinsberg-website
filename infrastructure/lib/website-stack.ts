import {
    aws_certificatemanager as acm,
    aws_iam as iam,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as cloudfrontOrigins,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_ssm as ssm,
    CfnOutput,
    RemovalPolicy,
    Stack,
    StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface WebsiteStackProps extends StackProps {
    domainName: string,
    subDomain: string
}

/**
 * SPAs served under a path of the site, each from its own bucket and deployed from its own repo.
 * `id` prefixes the construct IDs: changing it would replace the (RETAIN, fixed-name) bucket.
 */
const PATH_APPS = [
    { id: 'ArsenalIq', prefix: 'arsenal-iq' }, // ~/projects/bpe/poc (Vue)
    { id: 'Mentat', prefix: 'mentat' },        // ~/projects/mentat/web (React)
];

export interface CloudFrontConstructs {
    contentBucket: s3.Bucket,
    distribution: cloudfront.Distribution
}

/**
 * Static site infrastructure which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class WebsiteStack extends Stack {
    readonly cloudFront: CloudFrontConstructs;

    constructor(scope: Construct, id: string, props: WebsiteStackProps) {
        super(scope, id, props);

        this.cloudFront = this.buildCFDistribution(props.domainName, `${props.subDomain}.${props.domainName}`,
            route53.HostedZone.fromLookup(this, 'hostedZone', { domainName: props.domainName }))
    }

    readonly buildCFDistribution = (apexDomain: string, siteDomain: string, hostedZone: route53.IHostedZone) => {
        const contentBucket = new s3.Bucket(this, 'PersonalWebsiteBucket', {
            bucketName: 'olafschweinsberg-website-assets',
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        const tlsCertificate = new acm.Certificate(this, 'SiteCertificate', {
            domainName: siteDomain,
            subjectAlternativeNames: [apexDomain],
            certificateName: 'Personal Website Cert',
            validation: acm.CertificateValidation.fromDns(hostedZone)
        });

        // Viewer-request routing (see lib/functions/spa-router.js): apex -> www redirect,
        // /<prefix> -> /<prefix>/ redirect, and index.html rewrites for each SPA's
        // extensionless routes. Missing assets are not rewritten, so they 404 natively.
        const routingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromInline(
                fs.readFileSync(path.join(__dirname, 'functions', 'spa-router.js'), 'utf8')
                    .replace(/__APEX_DOMAIN__/g, apexDomain)
                    .replace(/__SITE_DOMAIN__/g, siteDomain)
                    .replace(/__PATH_APPS__/g, JSON.stringify(PATH_APPS.map(a => a.prefix)))),
        });

        const functionAssociations = [{
            function: routingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }];

        // One bucket per path app. CloudFront forwards the full request path to the origin,
        // so its objects MUST live under the `<prefix>/` key prefix (e.g. arsenal-iq/index.html),
        // never at the bucket root.
        const pathApps = PATH_APPS.map(app => {
            const bucket = new s3.Bucket(this, `${app.id}Bucket`, {
                bucketName: `olafschweinsberg-${app.prefix}-assets`,
                publicReadAccess: false,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                enforceSSL: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
                versioned: true,
                removalPolicy: RemovalPolicy.RETAIN,
            });
            const behavior: cloudfront.BehaviorOptions = {
                origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(bucket),
                compress: true,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                // Respects origin Cache-Control (min TTL 1s, max 1y).
                // Expected metadata: <prefix>/index.html -> `no-cache`;
                // <prefix>/assets/* (hashed) -> `public, max-age=31536000, immutable`.
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
                functionAssociations,
            };
            return { ...app, bucket, behavior };
        });

        const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
            certificate: tlsCertificate,
            defaultRootObject: 'index.html',
            domainNames: [siteDomain, apexDomain],
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
            defaultBehavior: {
                origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(contentBucket),
                compress: true,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
                functionAssociations,
            },
            // Exact match only: `/arsenal-iq*` would also capture `/arsenal-iqfoo`.
            // `/arsenal-iq` is always answered by the router function (301 to `/arsenal-iq/`).
            additionalBehaviors: Object.fromEntries(pathApps.flatMap(a => [
                [`/${a.prefix}`, a.behavior],
                [`/${a.prefix}/*`, a.behavior],
            ])),
        });

        // With OAC, S3 answers 403 for missing keys unless the caller may list the bucket.
        // Grant ListBucket next to the GetObject statement OAC already added so missing
        // files return a native 404.
        [contentBucket, ...pathApps.map(a => a.bucket)].forEach(bucket => bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:ListBucket'],
            resources: [bucket.bucketArn],
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            conditions: { StringEquals: { 'AWS:SourceArn': this.formatArn({
                service: 'cloudfront', region: '', resource: 'distribution', resourceName: distribution.distributionId,
            }) } },
        })));

        // Deploy site contents to S3 bucket. Split in two so cache headers differ:
        // hashed CRA assets (static/*) are immutable; everything else (index.html, etc.)
        // must revalidate so browsers pick up new deploys immediately.
        const hashedAssets = new s3deploy.BucketDeployment(this, 'DeployHashedAssets', {
            sources: [ s3deploy.Source.asset('../website/build') ],
            destinationBucket: contentBucket,
            exclude: [ '*' ],
            include: [ 'static/*' ],
            cacheControl: [ s3deploy.CacheControl.fromString('public, max-age=31536000, immutable') ],
        });

        const rootFiles = new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
            sources: [ s3deploy.Source.asset('../website/build') ],
            destinationBucket: contentBucket,
            exclude: [ 'static/*' ],
            cacheControl: [ s3deploy.CacheControl.noCache() ],
            distribution,
            distributionPaths: [ '/*' ],
        });
        rootFiles.node.addDependency(hashedAssets);

        // Route53 alias record for the CloudFront distribution
        new route53.ARecord(this, 'SiteAliasRecord', {
            recordName: siteDomain,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone: hostedZone
        });

        new route53.ARecord(this, 'ApexAliasRecord', {
            recordName: apexDomain,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone: hostedZone
        });

        // Read by each app's local deploy script (see docs/arsenal-iq-hosting.md)
        pathApps.forEach(a => {
            new ssm.StringParameter(this, `${a.id}BucketNameParam`, {
                parameterName: `/olafschweinsberg/${a.prefix}/bucket-name`,
                stringValue: a.bucket.bucketName,
            });
            new ssm.StringParameter(this, `${a.id}DistributionIdParam`, {
                parameterName: `/olafschweinsberg/${a.prefix}/distribution-id`,
                stringValue: distribution.distributionId,
            });
            new CfnOutput(this, `${a.id}BucketName`, { value: a.bucket.bucketName });
            new CfnOutput(this, `${a.id}DistributionId`, { value: distribution.distributionId });
        });
        // Mentat also needs its public URL: login callbacks and CORS in its own stack, smoke checks in its deploy
        new ssm.StringParameter(this, 'MentatUrlParam', {
            parameterName: '/olafschweinsberg/mentat/url',
            stringValue: `https://${siteDomain}/mentat`,
        });

        new CfnOutput(this, 'Bucket', { value: contentBucket.bucketName });
        new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
        new CfnOutput(this, 'Site', { value: 'https://' + siteDomain });
        new CfnOutput(this, 'Certificate', { value: tlsCertificate.certificateArn });

        return {
            contentBucket,
            distribution
        };
    }
}
