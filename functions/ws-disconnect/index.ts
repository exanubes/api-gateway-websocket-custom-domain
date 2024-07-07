import {
  DeleteItemCommand,
  type DeleteItemCommandInput,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { type APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const client = new DynamoDBClient();
const table = process.env.CONNECTIONS_TABLE;

export const handler = async function handler(event) {
  const input: DeleteItemCommandInput = {
    TableName: table,
    Key: {
      connectionId: { S: event.requestContext.connectionId },
    },
  };

  const command = new DeleteItemCommand(input);
  await client.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "disconnected.",
    }),
  };
} satisfies APIGatewayProxyWebsocketHandlerV2;
