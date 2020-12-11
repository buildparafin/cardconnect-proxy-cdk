import * as cdk from "@aws-cdk/core";
import { EndpointType } from "@aws-cdk/aws-apigateway";

import { Proxy } from "./proxy";

export class CardconnectProxyCdkTsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const proxy = new Proxy(
      this,
      "ParafinProxyNew", // ID
      {
        apiName: "HttpProxyNew",
        endpointType: EndpointType.EDGE,
        baseUrl: "https://fts-uat.cardconnect.com/cardconnect/rest",
        cardConnectAuth: "Basic dGVzdGluZzp0ZXN0aW5nMTIz",
        authHandler: "restrictMerchIds.handler",
        enableCloudwatch: true,
        requireApiKey: true,
      }
    );

    // Add a single endpoint for now, which will be filtered by merchid wbitelist
    proxy.addEndpoint("funding");
  }
}
