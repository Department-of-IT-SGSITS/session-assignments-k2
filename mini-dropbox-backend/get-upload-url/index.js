import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const BUCKET_NAME = process.env.BUCKET_NAME;
const BUCKET_REGION = process.env.BUCKET_REGION;
const s3Client = new S3Client({ region: BUCKET_REGION });

export const handler = async (event) => {
  try {
    // Get the user's unique ID from the Cognito authorizer context
    const userId = event.requestContext.authorizer.jwt.claims.sub;

    const body = JSON.parse(event.body);
    const { fileName, fileType, fileSize } = body;
    
    // --- Start validation logic ---
    if (!fileName || !fileType || !fileSize) {
        return { statusCode: 400, body: JSON.stringify({ message: "Missing fileName, fileType, or fileSize" })};
    }
    const MAX_FILE_SIZE_MB = 5;
    if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return { statusCode: 400, body: JSON.stringify({ message: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.` })};
    }
    
    // --- THIS IS THE UPDATED LINE ---
    const ALLOWED_FILE_TYPES = [
        "image/jpeg", 
        "image/png",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "video/mp4"
    ];

    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
        return { statusCode: 400, body: JSON.stringify({ message: "Invalid file type." })};
    }
 
    const randomBytes = crypto.randomBytes(16);
    // Including userId in the S3 key for better organization
    const storageKey = `${userId}/${randomBytes.toString("hex")}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      ContentType: fileType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ uploadUrl, storageKey }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "Error generating upload URL" }) };
  }
};