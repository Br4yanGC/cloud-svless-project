const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const eventbridge = new AWS.EventBridge();

const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  console.log('🔓 Enabling review for order:', JSON.stringify(event, null, 2));

  try {
    const { orderId, customerId, detail } = event;
    const orderIdToUpdate = orderId || detail?.orderId;
    const customerIdToUpdate = customerId || detail?.customerId;

    if (!orderIdToUpdate) {
      throw new Error('orderId is required');
    }

    // Actualizar el pedido para habilitar la calificación
    const updateParams = {
      TableName: ORDERS_TABLE,
      Key: { id: orderIdToUpdate },
      UpdateExpression: 'SET reviewable = :true, reviewEnabledAt = :now, reviewSubmitted = :false',
      ExpressionAttributeValues: {
        ':true': true,
        ':false': false,
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(updateParams).promise();
    console.log('✅ Order updated - review enabled:', result.Attributes);

    // Publicar evento de que la reseña está habilitada
    await eventbridge.putEvents({
      Entries: [{
        Source: 'restaurant.reviews',
        DetailType: 'ReviewEnabled',
        Detail: JSON.stringify({
          orderId: orderIdToUpdate,
          customerId: customerIdToUpdate,
          reviewEnabledAt: new Date().toISOString()
        }),
        EventBusName: `restaurant-events-${process.env.STAGE}`
      }]
    }).promise();

    console.log('📢 ReviewEnabled event published to EventBridge');

    return {
      statusCode: 200,
      orderId: orderIdToUpdate,
      reviewEnabled: true,
      reviewEnabledAt: result.Attributes.reviewEnabledAt,
      message: 'Review successfully enabled for order'
    };

  } catch (error) {
    console.error('❌ Error enabling review:', error);
    throw error;
  }
};
