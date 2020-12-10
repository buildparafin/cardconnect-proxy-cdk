const core = require("@aws-cdk/core");
const aws_lambda = require("@aws-cdk/aws-lambda");
const iam = require("@aws-cdk/aws-iam");
const apiGateway = require("@aws-cdk/aws-apigateway");

class Proxy extends core.Construct {
  constructor(scope, id, baseUrl, authorization, authHandler, props) {
    super(scope, id);
    this.baseUrl = baseUrl;
    this.authorization = authorization;
    if (authHandler) {
      this.authorizer = this.getAuthorizer(authHandler);
    }
    this.api = new apiGateway.RestApi(this, "API", {
      restApiName: props.apiName,
      endpointConfiguration: {
        types: [props.endpointType],
      },
    });
  }

  addEndpoint(path, method = "GET") {
    new apiGateway.Resource(this, path, {
      parent: this.api.root,
      pathPart: path,
    }).addMethod(
      method,
      new apiGateway.HttpIntegration(`${this.baseUrl}/${path}`, {
        httpMethod: method,
        options: {
          requestParameters: {
            "integration.request.header.Authorization": `'${this.authorization}'`,
          },
        },
      }),
      {
        authorizer: this.authorizer,
      }
    );
  }

  // Construct a Lambda that can approve or deny individual requests
  getAuthorizer(handler) {
    let apiGatewayRole = new iam.Role(this, "cc_apiGateway_role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      roleName: "cc_apiGateway_role",
      inlinePolicies: {
        invokeLambdas: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["lambda:InvokeFunction"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });
    let basicAuth = new aws_lambda.Function(this, `basicAuthLambda${handler}`, {
      runtime: aws_lambda.Runtime.NODEJS_12_X,
      code: new aws_lambda.AssetCode("lib/lambdas"),
      handler: handler,
    });
    let role = new iam.Role(this, "RestApiAuthHandlerRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    basicAuth.grantInvoke(role);
    return new apiGateway.RequestAuthorizer(this, `requestAuth${handler}`, {
      handler: basicAuth,
      assumeRole: apiGatewayRole,
      identitySources: [apiGateway.IdentitySource.queryString("merchid")],
    });
  }
}
module.exports = { Proxy };
