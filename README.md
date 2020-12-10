# CDK CardConnect Proxy

This project is a self-contained CDK system for launching an API Gateway instance, that can pass on a whitelisted set of read-only queries to CardConnect with you credentials.

There is both a JavaScript and TypeScript version; you may run this out of either subdirectory.

## Configuring

A stack for running a secure CardConnect proxy is in `./lib/cardconnect-proxy-cdk-stack.js` and may be either imported into an existing app, or run from the app `./bin/cardconnect-proxy-cdk.js`.

In this file you can specify:

- remote URL for CardConnect
- Authentication token (may be loaded from Secrets Manager)
- A basic lambda for filtering valid requests.
- Which exact endpoints to expose (currently just `/funding` is needed).

The default lambda is in `./lib/lambdas/restrictMerchIds.js` and contains a small whitelist of merchids, that may be customized. A custom access policy can also be introduced there if you wanted to have an IP whitelist, or IAM restrictions.

As needed, this may also be attached to a subdomain or to an authentication system.

## Build

To build this app, you need to be in this folder and run the following:

```
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then the dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## Results

Accessing a whitelisted merchid should give results:
https://klf2tnospb.execute-api.us-east-1.amazonaws.com/prod/funding/?merchid=496160873888&date=20201101

```
{
    "fundingmasterid":3063277434164835,
    "fundingdate":"2020-11-01",
    "adjustments":[ ... ],
    "datechanged":null,
    "fundings":[ ... ],
    "txs": [ ... ],
}
```

Accessing any other merchid should not:
https://klf2tnospb.execute-api.us-east-1.amazonaws.com/prod/funding/?merchid=496160873889&date=20201101

```
{"Message":"User is not authorized to access this resource with an explicit deny"}
```

## CDK Javascript Boilerplate

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands (javascript)

- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Useful commands (typescript)

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
