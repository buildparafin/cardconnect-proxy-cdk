#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { CardconnectProxyCdkStack } = require('../lib/cardconnect-proxy-cdk-stack');

const app = new cdk.App();
new CardconnectProxyCdkStack(app, 'CardconnectProxyCdkStack');
