import * as aws from "@pulumi/aws";
import { WebsocketApi } from "@exanubes/pulumi-websocket-api";
import {
  NodejsFunction,
  TypescriptAssetArchive,
} from "@exanubes/pulumi-nodejs-function";
import * as pulumi from "@pulumi/pulumi";

export function setupWebsocketApi() {
  const table = new aws.dynamodb.Table("connections", {
    name: "WS_CONNECTIONS",
    attributes: [{ name: "connectionId", type: "S" }],
    billingMode: "PAY_PER_REQUEST",
    hashKey: "connectionId",
  });

  const api = new WebsocketApi("websocket-api", {
    name: "exanubes-websocket-api",
    routeSelectionExpression: "$request.body.type",
  });

  const stage = api.addStage("dev");

  const connectLambda = new NodejsFunction("WebSocket_Connect", {
    code: new TypescriptAssetArchive("functions/ws-connect/index.ts", {
      external: ["@aws-sdk", "aws-lambda"],
    }),
    handler: "index.handler",
    environment: {
      variables: {
        CONNECTIONS_TABLE: table.arn,
      },
    },
    policy: {
      policy: table.arn.apply((tableArn) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["dynamodb:PutItem"],
              Effect: "Allow",
              Resource: tableArn,
            },
          ],
        }),
      ),
    },
  });

  const disconnectLambda = new NodejsFunction("WebSocket_Disconnect", {
    code: new TypescriptAssetArchive("functions/ws-disconnect/index.ts", {
      external: ["@aws-sdk", "aws-lambda"],
    }),
    handler: "index.handler",
    policy: {
      policy: table.arn.apply((tableArn) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["dynamodb:DeleteItem"],
              Effect: "Allow",
              Resource: tableArn,
            },
          ],
        }),
      ),
    },
    environment: {
      variables: {
        CONNECTIONS_TABLE: table.arn,
      },
    },
  });

  const messageLambda = new NodejsFunction("WebSocket_Message", {
    code: new TypescriptAssetArchive("functions/ws-message/index.ts", {
      external: ["@aws-sdk", "aws-lambda"],
    }),
    handler: "index.handler",
    policy: {
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["dynamodb:DeleteItem", "dynamodb:Scan"],
            Effect: "Allow",
            Resource: table.arn,
          },
        ],
      },
    },
    environment: {
      variables: {
        CONNECTIONS_TABLE: table.arn,
      },
    },
  });

  messageLambda.addPolicy("manage-connections-policy", {
    policy: api.getInvokePolicy(stage.name),
  });

  const connectIntegration = api.addLambdaIntegration("connect", connectLambda);
  const disconnectIntegration = api.addLambdaIntegration(
    "disconnect",
    disconnectLambda,
  );
  const messageIntegration = api.addLambdaIntegration("message", messageLambda);

  connectLambda.grantInvoke(
    "connect-grant-invoke",
    "apigateway.amazonaws.com",
    pulumi.interpolate`${api.executionArn}/${stage.name}/$connect`,
  );
  disconnectLambda.grantInvoke(
    "disconnect-grant-invoke",
    "apigateway.amazonaws.com",
    pulumi.interpolate`${api.executionArn}/${stage.name}/$disconnect`,
  );
  messageLambda.grantInvoke(
    "message-grant-invoke",
    "apigateway.amazonaws.com",
    pulumi.interpolate`${api.executionArn}/${stage.name}/message`,
  );

  api.addRoute("$connect", {
    integration: connectIntegration,
  });
  api.addRoute("$disconnect", {
    integration: disconnectIntegration,
  });
  api.addRoute("message", {
    integration: messageIntegration,
  });

  return {
    api: api.resource,
    stage,
  };
}
