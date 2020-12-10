import { Construct, CfnOutput, Duration } from "@aws-cdk/core";
import { AssetCode, Function, Runtime } from "@aws-cdk/aws-lambda";
import iam = require("@aws-cdk/aws-iam");

import * as apiGateway from "@aws-cdk/aws-apigateway";

export interface ProxyProps {
  readonly apiName: string;
  readonly endpointType: apiGateway.EndpointType;
}

export class Proxy extends Construct {
  public readonly api: apiGateway.RestApi;
  public readonly baseUrl: string;
  public readonly proxyResource: apiGateway.ProxyResource;
  public readonly authorizer: apiGateway.RequestAuthorizer | undefined;
  public readonly authorization: string;

  constructor(
    scope: Construct,
    id: string,
    baseUrl: string,
    authorization: string,
    authHandler: string | undefined,
    props: ProxyProps
  ) {
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

  public addEndpoint(path: string, method: string = "GET") {
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
  private getAuthorizer(handler: string): apiGateway.RequestAuthorizer {
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

    let basicAuth = new Function(this, `basicAuthLambda${handler}`, {
      runtime: Runtime.NODEJS_12_X,
      code: new AssetCode("lib/lambdas"),
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
      // resultsCacheTtl: Duration.minutes(0),
    });
  }
}
