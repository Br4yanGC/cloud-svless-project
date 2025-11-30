const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const REVIEWS_TABLE = process.env.REVIEWS_TABLE;

exports.handler = async (event) => {
  console.log('🔍 Checking for review:', JSON.stringify(event, null, 2));

  try {
    const { orderId, customerId } = event;

    // Buscar si existe una reseña para este pedido
    const result = await dynamodb.get({
      TableName: REVIEWS_TABLE,
      Key: { orderId }
    }).promise();

    const hasReview = !!result.Item;

    console.log(`Review status for order ${orderId}: ${hasReview ? 'EXISTS' : 'NOT FOUND'}`);

    return {
      ...event,
      hasReview,
      reviewData: result.Item || null,
      checkedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error checking review:', error);
    
    // En caso de error, asumimos que no hay review para continuar el workflow
    return {
      ...event,
      hasReview: false,
      error: error.message,
      checkedAt: new Date().toISOString()
    };
  }
};
