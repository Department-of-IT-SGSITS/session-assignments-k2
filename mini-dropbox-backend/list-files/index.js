import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const TABLE_NAME = process.env.TABLE_NAME;
const INDEX_NAME = process.env.INDEX_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const s3Client = new S3Client({});

export const handler = async (event) => {
  // Get the user's unique ID securely from the authorizer
  const userId = event.requestContext.authorizer.jwt.claims.sub;

  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: INDEX_NAME,
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
  });

  try {
    const response = await docClient.send(queryCommand);
    const files = response.Items;

    for (const file of files) {
      const getObjectParams = {
        Bucket: BUCKET_NAME,
        Key: file.storageKey,
        ResponseContentDisposition: `attachment; filename="${file.originalFileName}"`,
      };
      const command = new GetObjectCommand(getObjectParams);
      file.downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(files) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "Error listing files" }) };
  }
};