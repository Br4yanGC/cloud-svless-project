const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const eventbridge = new AWS.EventBridge();
const apigateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

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

    // Notificar via WebSocket a TODOS los usuarios conectados
    await broadcastOrderUpdate(result.Attributes);

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

/**
 * Broadcast order update via WebSocket
 */
async function broadcastOrderUpdate(order) {
  try {
    const CONNECTIONS_TABLE = `restaurant-connections-${process.env.STAGE}`;
    
    // Obtener todas las conexiones activas
    const connectionsResult = await dynamodb.scan({
      TableName: CONNECTIONS_TABLE
    }).promise();

    console.log(`📡 Broadcasting to ${connectionsResult.Items.length} connections`);

    // Enviar mensaje a cada conexión
    const message = JSON.stringify({
      type: 'REVIEW_ENABLED',
      order: order,
      message: `Pedido ${order.orderNumber} ya puede ser calificado`
    });

    const promises = connectionsResult.Items.map(async ({ connectionId }) => {
      try {
        await apigateway.postToConnection({
          ConnectionId: connectionId,
          Data: message
        }).promise();
        console.log(`✅ Sent to connection ${connectionId}`);
      } catch (error) {
        if (error.statusCode === 410) {
          // Conexión obsoleta, eliminarla
          console.log(`🗑️  Deleting stale connection ${connectionId}`);
          await dynamodb.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId }
          }).promise();
        } else {
          console.error(`❌ Error sending to ${connectionId}:`, error);
        }
      }
    });

    await Promise.all(promises);
    console.log('📢 Broadcast completed');
  } catch (error) {
    console.error('❌ Error broadcasting:', error);
    // No lanzar error para que no falle el flujo principal
  }
}
