import * as cdk from "@aws-cdk/core";
import { CardconnectProxyCdkTsStack } from "../lib/cardconnect-proxy-cdk-ts-stack";

const app = new cdk.App();
new CardconnectProxyCdkTsStack(app, "CardconnectProxyCdkTsStack");
