const cdk = require("@aws-cdk/core");

const { EndpointType } = require("@aws-cdk/aws-apigateway");
const { Proxy } = require("./proxy");
class CardconnectProxyCdkStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const proxy = new Proxy(
      this,
      "Proxy", // Name
      "https://fts-uat.cardconnect.com/cardconnect/rest", // Remote endpoint (test environment)
      "Basic dGVzdGluZzp0ZXN0aW5nMTIz", // Auth token (test environment)
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

module.exports = { CardconnectProxyCdkStack };
