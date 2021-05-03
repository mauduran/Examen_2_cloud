//No requiere package.json ni node modules porque no tiene dependencias;
const aws = require('aws-sdk');

const dynamoDB = new aws.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
    try {
        const params = {
            KeyConditionExpression: "pk = :pk  and begins_with (sk, :sk)",
            ExpressionAttributeValues: {
                ":pk": event.curp,
                ":sk": "#ID#"
            },
            TableName: process.env.tableName,
        }
        const data = await dynamoDB.query(params).promise()
        return  {
                curp: event.curp,
                items: data.Items
            }
        } catch (e) {
        callback('[ERROR] No se pueden obtener los datos.');
    }
    
    
}