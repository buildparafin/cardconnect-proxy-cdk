import { Construct, Duration } from "@aws-cdk/core";
import { AssetCode, Function, Runtime } from "@aws-cdk/aws-lambda";
import iam = require("@aws-cdk/aws-iam");

import * as apiGateway from "@aws-cdk/aws-apigateway";

export interface ProxyProps {
  // Name for the Proxy as it is deployed on API Gateway
  readonly apiName: string;

  // Base url for CardConnect
  readonly baseUrl: string;

  // Auth token for CardConnect
  readonly cardConnectAuth: string;

  // Array of merchids that are allowed to be queried.
  // The way we use this lambda is that it is a middleware which authorizes which
  // requests Parafin is allowed to make. Once the request is authenticated by
  // the lambda, the request is directly proxied to CardConnect by API Gateway using
  // the HTTP integration.
  // Limited to 300 (by environment variable restrictions)
  readonly merchidWhitelist?: string[];

  // Automatically configure an AWS CloudWatch role for API Gateway if set to true
  // Default value is true
  readonly enableCloudwatch?: boolean;

  // Create and require the api key for all requests to this API. Default is true.
  readonly requireApiKey?: boolean;

  // Provide an IP whitelist. Using empty array doesn't allow any IPs,
  // using undefined opens up to all IPs. Default is undefined i.e. open to all IPs.
  readonly ipWhitelist?: string[];
}

export class Proxy extends Construct {
  public readonly api: apiGateway.RestApi;
  public readonly apiName: string;
  public readonly baseUrl: string;
  public readonly proxyResource: apiGateway.ProxyResource;
  public readonly authorizer: apiGateway.RequestAuthorizer | undefined;
  public readonly authorization: string;
  public readonly enableCloudwatch: boolean;
  public readonly requireApiKey: boolean;

  constructor(scope: Construct, id: string, props: ProxyProps) {
    super(scope, id);

    this.apiName = props.apiName;
    this.baseUrl = props.baseUrl;
    this.authorization = props.cardConnectAuth;

    const enableCloudwatch =
      props.enableCloudwatch == undefined ? true : props.enableCloudwatch;

    if (props.merchidWhitelist != undefined) {
      this.authorizer = this.getAuthorizer(props.merchidWhitelist);
    }

    const policy: iam.PolicyDocument | undefined =
      props.ipWhitelist == undefined
        ? undefined
        : this.createResourcePolicy(props.ipWhitelist);

    this.api = new apiGateway.RestApi(this, "API", {
      restApiName: `${props.apiName}Proxy`,
      endpointConfiguration: {
        types: [apiGateway.EndpointType.EDGE],
      },
      cloudWatchRole: enableCloudwatch,
      policy: policy,
    });

    this.requireApiKey =
      props.requireApiKey == undefined ? true : props.requireApiKey;

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
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "execute-api:Invoke",
          Resource: "execute-api:/*",
        },
        {
          Effect: "Deny",
          Principal: "*",
          Action: "execute-api:Invoke",
          Resource: "execute-api:/*",
          Condition: {
            NotIpAddress: {
              "aws:SourceIp": ipWhitelist,
            },
          },
        },
      ],
    });
  }

  // Add API Key requirement to the created RestApi
  private addApiKeyAuth() {
    const apiKey = new apiGateway.ApiKey(this, "Parafin", {
      apiKeyName: "Parafin",
      description: `To be used by Parafin to access the ${this.apiName} data`,
    });
    this.api.addUsagePlan(`${this.apiName}Data`, {
      name: `${this.apiName}Data`,
      description: `Usage of the ${this.apiName} proxy API to expose ${this.apiName} data`,
      apiKey: apiKey,
      apiStages: [{ api: this.api, stage: this.api.deploymentStage }],
    });
  }

  // Construct a Lambda that can approve or deny individual requests
  private getAuthorizer(
    merchidWhitelist: string[]
  ): apiGateway.RequestAuthorizer {
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

    let basicAuth = new Function(this, "basicAuthLambdaRestrictMerchIds", {
      runtime: Runtime.NODEJS_12_X,
      code: new AssetCode("lib/lambdas"),
      handler: "restrictMerchIds.handler",
      environment: {
        MERCHIDS: merchidWhitelist.join(","),
      },
    });
    let role = new iam.Role(this, "RestApiAuthHandlerRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    basicAuth.grantInvoke(role);

    return new apiGateway.RequestAuthorizer(
      this,
      "requestAuthRestrictMerchIds",
      {
        handler: basicAuth,
        assumeRole: apiGatewayRole,
        identitySources: [apiGateway.IdentitySource.queryString("merchid")],
        resultsCacheTtl: Duration.minutes(0),
      }
    );
  }
}
