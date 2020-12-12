import * as cdk from "@aws-cdk/core";

import { Proxy } from "../lib/proxy";

export class CardconnectProxyCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      }
    );

    // Add a single endpoint for now, which will be filtered by merchid whitelist
    proxy.addEndpoint("funding", "GET");
  }
}

const app = new cdk.App();
new CardconnectProxyCdkStack(app, "CardconnectProxyCdkStack");
