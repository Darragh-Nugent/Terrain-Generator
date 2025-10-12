const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const path = require("path");

const RULES_PATH = path.join(__dirname, "..", "data", "rules.json");

const qutUsername = "n11547227@qut.edu.au";

exports.loadStyles = async () => {
  const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
  const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

  const command = new DynamoDBLib.QueryCommand({
    TableName: process.env.DYNAMO_NAME,
    KeyConditionExpression: "#partitionKey = :username",
    FilterExpression: "user_id = :userId",
    ExpressionAttributeNames: {
      "#partitionKey": "qut-username",
    },
    ExpressionAttributeValues: {
      ":username": qutUsername,
      ":userId": 0
    },
  });

  // Send the command to get an item
  try {
    const response = await docClient.send(command);
    console.log("Data received");
    return response.Items;
  } catch (err) {
    console.log(err);
  }
}

exports.addStyle = async (newStyle) => {
  const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
  const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

  const command = new DynamoDBLib.PutCommand({
    TableName: process.env.DYNAMO_NAME,
    Item: {
      "qut-username": qutUsername,
      id: uuidv4(),
      name: newStyle.name,
      user_id: 0,
      mapping: newStyle.mapping,
    }
  });

  try {
    await docClient.send(command);
    console.log("Style added to DynamoDB.");
    return newStyle;
  } catch (err) {
    console.error("DynamoDB error:", err);
    throw err;
  }
}