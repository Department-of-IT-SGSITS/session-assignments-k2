import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.TABLE_NAME;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  const promises = event.Records.map(async (record) => {
    const storageKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const fileSize = record.s3.object.size;
    
    // NEW: Extract the userId from the S3 key (e.g., "us-east-1:uuid/random-filename.txt")
    const userId = storageKey.split('/')[0];
    const originalFileName = storageKey.substring(storageKey.indexOf("-") + 1);
    const fileId = randomUUID();
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: { fileId, userId, storageKey, originalFileName, fileSize, uploadTimestamp: new Date().toISOString() },
    });

    try {
      await docClient.send(command);
      console.log(`Successfully recorded metadata for ${storageKey}`);
    } catch (err) {
      console.error(`Error recording metadata for ${storageKey}:`, err);
    }
  });

  await Promise.all(promises);
  return { statusCode: 200, body: JSON.stringify({ message: "Metadata processing complete." }) };
};