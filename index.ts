import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { setupWebsocketApi } from "./src/setup-websocket-api";

const config = new pulumi.Config();
const CERTIFICATE_ARN = config.requireSecret("certificateArn");

const { api, stage } = setupWebsocketApi();

const domainName = new aws.apigatewayv2.DomainName("domain-name", {
  domainName: "exanub.es",
  domainNameConfiguration: {
    certificateArn: CERTIFICATE_ARN,
    endpointType: "REGIONAL",
    securityPolicy: "TLS_1_2",
  },
});

export const ws_api_url = pulumi.interpolate`${api.apiEndpoint}/${stage.name}/`;
