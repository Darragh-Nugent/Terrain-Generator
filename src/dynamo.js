require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const path = require("path");

const RULES_PATH = path.join(__dirname, "data", "rules.json");

const qutUsername = "n11547227@qut.edu.au";
const sortKey = "name";

async function main() {
    const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
    const docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);
    const data = JSON.parse(fs.readFileSync(RULES_PATH));


    for (const style of data) {
        console.log(style);
        command = new DynamoDBLib.PutCommand({
            TableName: process.env.DYNAMO_NAME,
            Item: {
                "qut-username": qutUsername,
                id: uuidv4(), 
                name: style.name,
                user_id: 0,
                mapping: style.mapping,
            },
        });

        try {
            const response = await docClient.send(command);
            //console.log("Put command response:", response);
        } catch (err) {
            //console.log(err);
        }

    }
}

main();