import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.TABLE_NAME;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {

  const userId = event.requestContext.authorizer.jwt.claims.sub;

  const body = JSON.parse(event.body);
  const { storageKey, originalFileName, fileSize, tag } = body;

  const fileId = randomUUID();

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      fileId: fileId,
      userId: userId,
      storageKey: storageKey,
      originalFileName: originalFileName,
      fileSize: fileSize,
      tag: tag || "No tag", 
      uploadTimestamp: new Date().toISOString(),
    },
  });

  try {
    await docClient.send(command);
    console.log(`Successfully recorded metadata for ${storageKey}`);
    return {
      statusCode: 201, 
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Metadata recorded successfully", fileId }),
    };
  } catch (err) {
    console.error(`Error recording metadata for ${storageKey}:`, err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error recording metadata" }),
    };
  }
};