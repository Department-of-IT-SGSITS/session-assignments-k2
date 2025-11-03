import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Get environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const INDEX_NAME = process.env.INDEX_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

// Initialize clients
const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const s3Client = new S3Client({});

export const handler = async (event) => {
  // Get the user's ID securely from the Cognito token
  const userId = event.requestContext.authorizer.jwt.claims.sub;
  // Get the search term from the query string, e.g., /files/search?query=report
  const { query: searchQuery } = event.queryStringParameters || {};

  if (!searchQuery) {
    // If no search query, return an empty list
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify([]),
    };
  }

  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: INDEX_NAME,
    // First, find all files belonging to the user
    KeyConditionExpression: "userId = :uid",
    // Then, filter those results for items where the tag or filename contains the search query
    FilterExpression: "contains(#tagName, :query) or contains(#fileName, :query)",
    ExpressionAttributeNames: {
      "#tagName": "tag",
      "#fileName": "originalFileName",
    },
    ExpressionAttributeValues: {
      ":uid": userId,
      ":query": searchQuery.toLowerCase(), // Make search case-insensitive
    },
  });

  try {
    const response = await docClient.send(command);
    const files = response.Items || [];

    // For each search result, generate a presigned URL for downloading
    for (const file of files) {
      const getObjectParams = {
        Bucket: BUCKET_NAME,
        Key: file.storageKey,
        ResponseContentDisposition: `attachment; filename="${file.originalFileName}"`,
      };
      const getCommand = new GetObjectCommand(getObjectParams);
      file.downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(files),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error searching files" }),
    };
  }
};