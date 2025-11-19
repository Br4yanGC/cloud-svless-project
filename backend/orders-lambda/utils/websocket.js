const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({});

const WEBSOCKET_BROADCAST_FUNCTION = process.env.WEBSOCKET_BROADCAST_FUNCTION || 'restaurant-websocket-dev-broadcastNotification';

// Notificar al staff del restaurante via WebSocket
const notifyRestaurantStaff = async (message) => {
  try {
    // Notificar a administradores del restaurante
    const adminEvent = {
      body: JSON.stringify({
        message,
        targetRole: 'admin'
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event', // Asíncrono
      Payload: JSON.stringify(adminEvent)
    }));

    console.log('✅ Notificación enviada al staff del restaurante via WebSocket');

    // También notificar a cocineros si es un nuevo pedido
    if (message.type === 'NEW_ORDER') {
      const cookEvent = {
        body: JSON.stringify({
          message,
          targetRole: 'cocinero'
        })
      };

      await lambdaClient.send(new InvokeCommand({
        FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
        InvocationType: 'Event',
        Payload: JSON.stringify(cookEvent)
      }));

      console.log('✅ Notificación enviada a cocineros via WebSocket');
    }
  } catch (err) {
    console.error('❌ Error al notificar al staff via WebSocket:', err);
    // No lanzamos error para no bloquear la operación
  }
};

// Notificar actualización de pedido a cliente específico
const notifyOrderUpdate = async ({ orderId, customerId, type, status, timeline, message }) => {
  try {
    const event = {
      body: JSON.stringify({
        message: {
          type,
          orderId,
          status,
          timeline,
          message
        },
        targetUserId: customerId // Notificar solo al cliente del pedido
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(event)
    }));

    console.log(`✅ Actualización de pedido enviada al cliente ${customerId}`);
  } catch (err) {
    console.error('❌ Error al notificar actualización de pedido:', err);
  }
};

// Notificar a un usuario específico
const notifyUser = async (userId, message) => {
  try {
    const event = {
      body: JSON.stringify({
        message,
        targetUserId: userId
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(event)
    }));

    console.log(`✅ Notificación enviada al usuario ${userId}`);
  } catch (err) {
    console.error('❌ Error al notificar al usuario:', err);
  }
};

// Broadcast a todos los clientes conectados
const broadcastToAll = async (message) => {
  try {
    const event = {
      body: JSON.stringify({
        message,
        broadcast: true
      })
    };

    await lambdaClient.send(new InvokeCommand({
      FunctionName: WEBSOCKET_BROADCAST_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(event)
    }));

    console.log('✅ Broadcast enviado a todos los clientes');
  } catch (err) {
    console.error('❌ Error al hacer broadcast:', err);
  }
};

module.exports = {
  notifyRestaurantStaff,
  notifyOrderUpdate,
  notifyUser,
  broadcastToAll
};
