import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Get environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

// Initialize clients
const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const s3Client = new S3Client({});

export const handler = async (event) => {
  // Get the fileId from the URL path
  const { fileId } = event.pathParameters;
  // Get the user's ID securely from the Cognito token
  const userId = event.requestContext.authorizer.jwt.claims.sub;

  try {
    // 1. Get the file metadata from DynamoDB to verify ownership
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { fileId },
    });
    const { Item: file } = await docClient.send(getCommand);

    // 2. SECURITY CHECK: Ensure the file exists and belongs to the user
    if (!file || file.userId !== userId) {
      return {
        statusCode: 404, // Not Found or 403 Forbidden are both appropriate
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "File not found or access denied" }),
      };
    }
    
    // 3. Delete the actual file from the S3 bucket
    const deleteS3Command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.storageKey,
    });
    await s3Client.send(deleteS3Command);

    // 4. Delete the metadata record from the DynamoDB table
    const deleteDbCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { fileId },
    });
    await docClient.send(deleteDbCommand);

    // 5. Return a success response
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "File deleted successfully" }),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error deleting file" }),
    };
  }
};