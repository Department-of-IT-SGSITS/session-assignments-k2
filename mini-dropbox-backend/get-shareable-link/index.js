import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import https from 'https'; // Import the https module

// Get environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

// Initialize clients
const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const s3Client = new S3Client({});

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

// Helper function to call the TinyURL API
function shortenUrl(longUrl) {
    return new Promise((resolve, reject) => {
        https.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', (err) => {
            console.error("Error calling TinyURL:", err);
            // If TinyURL fails, we can just return the long URL as a fallback
            resolve(longUrl); 
        });
    });
}

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
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "File not found or access denied" }),
      };
    }
    
    // 3. Generate a long-lived presigned URL for the S3 object
    const s3Command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.storageKey,
      ResponseContentDisposition: `attachment; filename="${file.originalFileName}"`,
    });
    
    const longShareableUrl = await getSignedUrl(s3Client, s3Command, {
        expiresIn: SEVEN_DAYS_IN_SECONDS,
    });

    // 4. NEW: Shorten the long URL using TinyURL
    const shortUrl = await shortenUrl(longShareableUrl);

    // 5. Return the SHORT shareable URL
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ shareableUrl: shortUrl }),
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error generating shareable link" }),
    };
  }
};