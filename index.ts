import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { setupWebsocketApi } from "./src/setup-websocket-api";

const config = new pulumi.Config();
const CERTIFICATE_ARN = config.requireSecret("certificateArn");
const HOSTED_ZONE_ID = config.requireSecret("hostedZoneId");
const DOMAIN_NAME = config.require("domainName");

const { api, stage } = setupWebsocketApi();

const domainName = new aws.apigatewayv2.DomainName("domain-name", {
  domainName: DOMAIN_NAME,
  domainNameConfiguration: {
    certificateArn: CERTIFICATE_ARN,
    endpointType: "REGIONAL",
    securityPolicy: "TLS_1_2",
  },
});

new aws.route53.Record("alias", {
  name: DOMAIN_NAME,
  type: aws.route53.RecordType.A,
  zoneId: HOSTED_ZONE_ID,
  aliases: [
    {
      name: domainName.domainNameConfiguration.targetDomainName,
      zoneId: domainName.domainNameConfiguration.hostedZoneId,
      evaluateTargetHealth: true,
    },
  ],
});

export const ws_api_url = pulumi.interpolate`${api.apiEndpoint}/${stage.name}/`;
