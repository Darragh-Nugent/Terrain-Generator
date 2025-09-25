const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "..", "data", "rules.json");

const qutUsername = "n11547227@qut.edu.au";

exports.loadStyles = async () => {
  // console.log("DynamoDB Table Name:", process.env.DYNAMO_NAME);
  // console.log("Key:", {
  //   'qut-username': qutUsername,
  //   user_id: 0,
  // });

  const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
  const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);

  command = new DynamoDBLib.QueryCommand({
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

exports.addRule = async (newRule) => {
  const rules = loadStyles();
  rules.push(newRule);
  fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
  return newRule;
}