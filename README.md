# CDK CardConnect Proxy

This project is a self-contained CDK system for launching an API Gateway instance, that can pass on a whitelisted set of read-only queries to CardConnect with you credentials.

There is both a JavaScript and TypeScript version; you may run this out of either subdirectory.

## Configuring

You may either import `./lib/proxy` into your app or run the secure CardConnect proxy in `./bin/cardconnect-proxy-cdk.js`
```
    const proxy = new Proxy(
      this,
      "ParafinProxy", // ID
      {
        apiName: "CardConnect",
        baseUrl: "https://fts-uat.cardconnect.com/cardconnect/rest",
        // This is the public test-account auth.  In practice this should be loaded from AWS Secrets Manager and not in Git.
        cardConnectAuth: "Basic dGVzdGluZzp0ZXN0aW5nMTIz",
        merchidWhitelist: ["496160873885", "496160873888"],
        enableCloudwatch: true,
        requireApiKey: false,
        ipWhitelist: undefined,
      }
    );

    // Add a single endpoint for now, which will be filtered by merchid whitelist
    proxy.addEndpoint("funding", "GET");
```

In this file you can specify:

- remote URL for CardConnect
- Authentication token (may be loaded from Secrets Manager)
- List of allowed Merchant Ids
- Which exact endpoints to expose (currently just `/funding` is needed).
- Whether to require an API Key
- Which IP addresses to allow to access this endpoint

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

## CDK Boilerplate

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
