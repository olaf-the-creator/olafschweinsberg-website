import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as fs from 'fs';
import * as path from 'path';
import { WebsiteStack } from '../lib/website-stack';

describe('WebsiteStack', () => {
    const app = new App();
    const stack = new WebsiteStack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
        domainName: 'example.com',
        subDomain: 'www',
    });
    const template = Template.fromStack(stack);

    test('bucket is private, encrypted and versioned', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
            VersioningConfiguration: { Status: 'Enabled' },
        });
    });

    test('uses Origin Access Control and no OAI', () => {
        template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 3);
        template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    });

    test('distribution serves both domains over HTTPS with no error-response rewrites', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                Aliases: ['www.example.com', 'example.com'],
                HttpVersion: 'http2and3',
                DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
                CustomErrorResponses: Match.absent(),
            }),
        });
    });

    test('routing function knows every path app', () => {
        template.hasResourceProperties('AWS::CloudFront::Function', {
            FunctionCode: Match.stringLikeRegexp('\\["arsenal-iq","mentat"\\]'),
        });
    });

    test('creates alias records for www and apex', () => {
        template.resourceCountIs('AWS::Route53::RecordSet', 2);
    });

    test('three private buckets, all grant CloudFront ListBucket', () => {
        template.resourceCountIs('AWS::S3::Bucket', 3);
        const policies = template.findResources('AWS::S3::BucketPolicy');
        const withList = Object.values(policies).filter(p =>
            JSON.stringify(p).includes('s3:ListBucket') && JSON.stringify(p).includes('cloudfront.amazonaws.com'));
        expect(withList).toHaveLength(3);
    });

    test('path app behaviors are exact matches', () => {
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: Match.objectLike({
                CacheBehaviors: [
                    Match.objectLike({ PathPattern: '/arsenal-iq' }),
                    Match.objectLike({ PathPattern: '/arsenal-iq/*' }),
                    Match.objectLike({ PathPattern: '/mentat' }),
                    Match.objectLike({ PathPattern: '/mentat/*' }),
                ],
            }),
        });
    });

    test('arsenal-iq keeps its construct IDs (a replaced RETAIN bucket would orphan the old one)', () => {
        for (const id of ['ArsenalIqBucket', 'ArsenalIqBucketNameParam', 'ArsenalIqDistributionIdParam']) {
            expect(Object.keys(template.toJSON().Resources).some(k => k.startsWith(id))).toBe(true);
        }
    });

    test('SSM parameters exist for each app deploy', () => {
        for (const app of ['arsenal-iq', 'mentat']) {
            template.hasResourceProperties('AWS::SSM::Parameter', { Name: `/olafschweinsberg/${app}/bucket-name` });
            template.hasResourceProperties('AWS::SSM::Parameter', { Name: `/olafschweinsberg/${app}/distribution-id` });
        }
        template.hasResourceProperties('AWS::SSM::Parameter', {
            Name: '/olafschweinsberg/mentat/url', Value: 'https://www.example.com/mentat',
        });
    });
});

describe('spa-router function', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/functions/spa-router.js'), 'utf8')
        .replace(/__APEX_DOMAIN__/g, 'example.com').replace(/__SITE_DOMAIN__/g, 'www.example.com')
        .replace(/__PATH_APPS__/g, '["arsenal-iq", "mentat"]');
    const handler = new Function(`${source}; return handler;`)();
    const run = (uri: string, qs: Record<string, any> = {}, host = 'www.example.com') =>
        handler({ request: { uri, querystring: qs, headers: { host: { value: host } } } });

    const rewrites: Array<[string, string]> = [
        ['/', '/index.html'],
        ['/about', '/index.html'],
        ['/projects/x', '/index.html'],
        ['/assets/index-abc.js', '/assets/index-abc.js'],
        ['/assets/nope.js', '/assets/nope.js'],
        ['/favicon.ico', '/favicon.ico'],
        ['/arsenal-iq/', '/arsenal-iq/index.html'],
        ['/arsenal-iq/pitcher/123', '/arsenal-iq/index.html'],
        ['/arsenal-iq/assets/index-def.js', '/arsenal-iq/assets/index-def.js'],
        ['/arsenal-iq/assets/nope.js', '/arsenal-iq/assets/nope.js'],
        ['/mentat/', '/mentat/index.html'],
        ['/mentat/models/abc', '/mentat/index.html'],
        ['/mentat/auth/callback', '/mentat/index.html'],
        ['/mentat/assets/index-ghi.js', '/mentat/assets/index-ghi.js'],
        // Not a path app: falls through to React
        ['/arsenal-iqfoo', '/index.html'],
        ['/mentatfoo', '/index.html'],
    ];
    test.each(rewrites)('%s -> %s', (uri, expected) => {
        expect(run(uri).uri).toBe(expected);
    });

    test('/arsenal-iq redirects to /arsenal-iq/, keeping the query string', () => {
        expect(run('/arsenal-iq').headers.location.value).toBe('/arsenal-iq/');
        expect(run('/arsenal-iq', { x: { value: '1' } })).toMatchObject({
            statusCode: 301, headers: { location: { value: '/arsenal-iq/?x=1' } },
        });
    });

    test('/mentat redirects to /mentat/', () => {
        expect(run('/mentat')).toMatchObject({ statusCode: 301, headers: { location: { value: '/mentat/' } } });
    });

    test('apex redirects to www', () => {
        expect(run('/about', {}, 'example.com').headers.location.value).toBe('https://www.example.com/about');
    });
});
