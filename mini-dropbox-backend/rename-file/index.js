import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME;

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

export const handler = async (event) => {
  const { fileId } = event.pathParameters;

  const userId = event.requestContext.authorizer.jwt.claims.sub;

  const { tag: newTag } = JSON.parse(event.body);

  if (!newTag) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "New tag is required" }),
    };
  }

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { fileId },

    UpdateExpression: "set #tagName = :tagValue",

    ConditionExpression: "userId = :uid",

    ExpressionAttributeNames: {
      "#tagName": "tag",
    },
    ExpressionAttributeValues: {
      ":tagValue": newTag,
      ":uid": userId,
    },
    ReturnValues: "ALL_NEW", 
  });

  try {
    const { Attributes } = await docClient.send(command);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(Attributes),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      
      return {
        statusCode: 404, 
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "File not found or access denied" }),
      };
    }
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error renaming file" }),
    };
  }
};