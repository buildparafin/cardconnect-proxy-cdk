import * as cdk from "@aws-cdk/core";
import { EndpointType } from "@aws-cdk/aws-apigateway";

import { Proxy } from "./proxy";

export class CardconnectProxyCdkTsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const proxy = new Proxy(
      this,
      "Proxy", // Name
      "https://fts-uat.cardconnect.com/cardconnect/rest", // Remote endpoint (test environment)
      "Basic dGVzdGluZzp0ZXN0aW5nMTIz", // Auth token (test environment, can be loaded from Secrets)
      "restrictMerchIds.handler", // Optional lambda that restricts valid requests
      {
        apiName: "HttpProxy",
        endpointType: EndpointType.EDGE,
      }
    );

    // Add a single endpoint for now, which will be filtered by merchid wbitelist
    proxy.addEndpoint("funding");
  }
}
