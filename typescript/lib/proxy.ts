import { Construct, CfnOutput, Duration } from "@aws-cdk/core";
import { AssetCode, Function, Runtime } from "@aws-cdk/aws-lambda";
import iam = require("@aws-cdk/aws-iam");

import * as apiGateway from "@aws-cdk/aws-apigateway";

export interface ProxyProps {
  // Name for the Proxy as it is deployed on API Gateway
  readonly apiName: string;

  // The endpoint type to be used for the API Gateway
  readonly endpointType: apiGateway.EndpointType;

  // Base url for CardConnect
  readonly baseUrl: string;

  // Auth token for CardConnect
  readonly cardConnectAuth: string;

  // Handler for lambda doing request authorization. 
  // The way we use this lambda is that it is a middleware which authorizes which
  // requests Parafin is allowed to make. Once the request is authenticated by 
  // the lambda, the request is directly proxied to CardConnect by API Gateway using
  // the HTTP integration.
  readonly authHandler?: string;

  // Automatically configure an AWS CloudWatch role for API Gateway if set to true
  // Default value is true
  readonly enableCloudwatch?: boolean;

  // Create and require the api key for all requests to this API. Default is true.
  readonly requireApiKey?: boolean;

  // Provide an IP whitelist. Use empty array to allow all IPs.
  readonly ipWhitelist: string[];
}

export class Proxy extends Construct {

  public readonly api: apiGateway.RestApi;
  public readonly baseUrl: string;
  public readonly proxyResource: apiGateway.ProxyResource;
  public readonly authorizer: apiGateway.RequestAuthorizer | undefined;
  public readonly authorization: string;
  public readonly enableCloudwatch: boolean;
  public readonly requireApiKey: boolean; 

  constructor(
    scope: Construct,
    id: string,
    props: ProxyProps
  ) {
    super(scope, id);

    this.baseUrl = props.baseUrl;
    this.authorization = props.cardConnectAuth;
    
    const enableCloudwatch = props.enableCloudwatch == undefined ? true : props.enableCloudwatch;

    if (props.authHandler) {
      this.authorizer = this.getAuthorizer(props.authHandler);
    }

    const policy: iam.PolicyDocument | undefined = (props.ipWhitelist.length > 0) ? this.createResourcePolicy(props.ipWhitelist) : undefined;


    this.api = new apiGateway.RestApi(this, "API", {
      restApiName: props.apiName,
      endpointConfiguration: {
        types: [props.endpointType],
      },
      cloudWatchRole: enableCloudwatch,
      policy: policy
    });

    this.requireApiKey = props.requireApiKey == undefined ? true : props.requireApiKey;

    if (this.requireApiKey) {
      this.addApiKeyAuth();
    }
      
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
        apiKeyRequired: this.requireApiKey,
        authorizer: this.authorizer,
      }
    );
  }

  private createResourcePolicy(ipWhitelist: string[]): iam.PolicyDocument {
    return iam.PolicyDocument.fromJson({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": "*",
          "Action": "execute-api:Invoke",
          "Resource": "execute-api:/*"
        },
        {
          "Effect": "Deny",
          "Principal": "*",
          "Action": "execute-api:Invoke",
          "Resource": "execute-api:/*",
          "Condition": {
            "NotIpAddress": {
                "aws:SourceIp": ipWhitelist
            }
          }
        }
      ]
    });
  }

  // Add API Key requirement to the created RestApi
  private addApiKeyAuth() {
    const apiKey = new apiGateway.ApiKey(this, "Parafin", {
      apiKeyName: "Parafin",
      description: "To be used by Parafin to access the card connect data",
    });
    this.api.addUsagePlan("CardConnectData", {
      name: "CardConnectData",
      description: "Usage of the CardConnect proxy API to expose CardConnect data",
      apiKey: apiKey,
      apiStages: [{api: this.api, stage: this.api.deploymentStage}],
    })
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
