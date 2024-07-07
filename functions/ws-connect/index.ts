import {
  DynamoDBClient,
  PutItemCommand,
  type PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { type APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const client = new DynamoDBClient();

const table = process.env.CONNECTIONS_TABLE;

export const handler = async function handler(event) {
  const input: PutItemCommandInput = {
    TableName: table,
    Item: {
      connectionId: {
        S: event.requestContext.connectionId,
      },
    },
  };

  const command = new PutItemCommand(input);
  const response = await client.send(command);

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Connected.",
    }),
  };
} satisfies APIGatewayProxyWebsocketHandlerV2;
