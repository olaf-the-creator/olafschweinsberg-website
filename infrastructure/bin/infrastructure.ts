#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StackProps } from "aws-cdk-lib";
import { WebsiteStack } from "../lib/website-stack";

const env: StackProps['env'] = {
    account: '668467132136',
    region: 'us-east-1'
};

const app = new cdk.App();

new WebsiteStack(app, 'StaticWebsiteStack', {
    env,
    domainName: 'olafschweinsberg.com',
    subDomain: 'www'
})
