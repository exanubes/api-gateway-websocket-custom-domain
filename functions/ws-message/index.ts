import { type APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import {
  DeleteItemCommand,
  type DeleteItemCommandInput,
  DynamoDBClient,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  type PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";

const dbClient = new DynamoDBClient();

type Item = { connectionId: { S: string } };

export const handler = async function handler(event) {
  const table = event.stageVariables?.CONNECTIONS_TABLE;
  const apiKeyMapping = event.stageVariables?.API_KEY_MAPPING;
  const body = event.body ? JSON.parse(event.body) : null;
  if (!body) throw new Error("No body");
  if (!table) throw new Error("table cannot be undefined");
  if (!apiKeyMapping) throw new Error("apiMappingKey cannot be undefined");
  
  const endpoint = `https://${event.requestContext.domainName}/${apiKeyMapping}`;

  const connections = await getConnections(table);

  const apiGw = new ApiGatewayManagementApiClient({
    apiVersion: "2018-11-29",
    endpoint,
  });

  await Promise.all(
    connections.map(async (connection) => {
      await sendMessage(apiGw, table, connection.connectionId.S, body.data);
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "emit lambda function",
    }),
  };
} satisfies APIGatewayProxyWebsocketHandlerV2;

async function handleStaleConnection(table: string, connectionId: string) {
  const input: DeleteItemCommandInput = {
    TableName: table,
    Key: { connectionId: { S: connectionId } },
  };
  const command = new DeleteItemCommand(input);
  return void dbClient.send(command);
}

async function getConnections(table: string) {
  const input: ScanCommandInput = {
    TableName: table,
    ProjectionExpression: "connectionId",
  };
  const command = new ScanCommand(input);

  const response = await dbClient.send(command);
  return (response.Items ?? []) as Item[];
}

async function sendMessage(
  api: ApiGatewayManagementApiClient,
  table: string,
  connectionId: string,
  body: string,
) {
  try {
    const input: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: body,
    };
    const command = new PostToConnectionCommand(input);
    await api.send(command);
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 410) {
      await handleStaleConnection(table, connectionId);
    }
    console.log(error);
  }
}
