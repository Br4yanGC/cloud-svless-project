const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const REVIEWS_TABLE = process.env.REVIEWS_TABLE;

exports.handler = async (event) => {
  console.log('🔍 Getting reviews for order:', JSON.stringify(event, null, 2));

  try {
    const orderId = event.pathParameters?.orderId;

    if (!orderId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'orderId is required'
        })
      };
    }

    // Buscar reseña por orderId usando GSI
    const result = await dynamodb.query({
      TableName: REVIEWS_TABLE,
      IndexName: 'OrderIdIndex',
      KeyConditionExpression: 'orderId = :orderId',
      ExpressionAttributeValues: {
        ':orderId': orderId
      }
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        reviews: result.Items || [],
        count: result.Count || 0
      })
    };

  } catch (error) {
    console.error('❌ Error getting reviews:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Failed to get reviews',
        details: error.message
      })
    };
  }
};
