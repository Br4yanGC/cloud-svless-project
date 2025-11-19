const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const NOTIFICATIONS_FUNCTION = process.env.NOTIFICATIONS_FUNCTION || 'restaurant-notifications-service-dev-sendNotification';
const USERS_TABLE = process.env.USERS_TABLE || 'restaurant-users-dev';

/**
 * Obtener usuario por ID desde DynamoDB
 */
async function getUserById(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { id: userId }
    };
    const result = await dynamoDB.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}

/**
 * Enviar notificación de pedido por email
 */
async function sendOrderNotification({ type, email, orderNumber, total, items, status }) {
  try {
    let subject, body;

    switch (type) {
      case 'ORDER_CREATED':
        subject = `Pedido Confirmado - ${orderNumber}`;
        body = `
          <h2>¡Gracias por tu pedido!</h2>
          <p>Tu pedido <strong>${orderNumber}</strong> ha sido confirmado.</p>
          <h3>Resumen del Pedido:</h3>
          <ul>
            ${items.map(item => `
              <li>${item.quantity}x ${item.name} ${item.size} - S/ ${(item.price * item.quantity).toFixed(2)}</li>
            `).join('')}
          </ul>
          <p><strong>Total: S/ ${total.toFixed(2)}</strong></p>
          <p>Tiempo estimado de entrega: 30-40 minutos</p>
          <p>Puedes rastrear tu pedido en tiempo real desde nuestra aplicación.</p>
        `;
        break;

      case 'ORDER_STATUS_UPDATE':
        subject = `Actualización de Pedido - ${orderNumber}`;
        
        const statusMessages = {
          cocinando: '🍳 Tu pedido está siendo preparado por nuestros chefs',
          empacado: '📦 Tu pedido está siendo empacado',
          en_camino: '🚗 Tu pedido está en camino',
          entregado: '✅ Tu pedido ha sido entregado. ¡Buen provecho!'
        };
        
        body = `
          <h2>Actualización de tu Pedido ${orderNumber}</h2>
          <p><strong>${statusMessages[status]}</strong></p>
          <p>Gracias por tu preferencia.</p>
        `;
        break;

      default:
        console.log(`Tipo de notificación desconocido: ${type}`);
        return;
    }

    const payload = {
      body: JSON.stringify({
        to: email,
        subject,
        body,
        type: 'ORDER_NOTIFICATION'
      })
    };

    const command = new InvokeCommand({
      FunctionName: NOTIFICATIONS_FUNCTION,
      InvocationType: 'Event', // Asíncrono
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    console.log(`✅ Email de notificación enviado a ${email}`);
  } catch (error) {
    console.error('❌ Error al enviar email de notificación:', error);
    throw error;
  }
}

/**
 * Notificar asignación de pedido a empleado
 */
async function notifyOrderAssignment(employeeId, orderNumber, role) {
  try {
    const employee = await getUserById(employeeId);
    
    if (!employee || !employee.email) {
      console.error(`No se pudo obtener email del empleado ${employeeId}`);
      return;
    }

    const roleNames = {
      cocinero: 'Cocinero',
      despachador: 'Despachador',
      repartidor: 'Repartidor'
    };

    const subject = `Nuevo Pedido Asignado - ${orderNumber}`;
    const body = `
      <h2>¡Tienes un nuevo pedido asignado!</h2>
      <p>Se te ha asignado el pedido <strong>${orderNumber}</strong></p>
      <p>Tu rol: <strong>${roleNames[role]}</strong></p>
      <p>Por favor, revisa el sistema para más detalles.</p>
    `;

    const payload = {
      body: JSON.stringify({
        to: employee.email,
        subject,
        body,
        type: 'ASSIGNMENT_NOTIFICATION'
      })
    };

    const command = new InvokeCommand({
      FunctionName: NOTIFICATIONS_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    console.log(`✅ Notificación de asignación enviada a ${employee.email}`);
  } catch (error) {
    console.error('❌ Error al notificar asignación:', error);
  }
}

/**
 * Enviar notificación de métricas diarias al admin
 */
async function sendDailyMetricsEmail(adminEmail, metrics) {
  try {
    const subject = `Reporte Diario de Pedidos - ${new Date().toLocaleDateString()}`;
    const body = `
      <h2>Resumen de Pedidos del Día</h2>
      <ul>
        <li><strong>Total de Pedidos:</strong> ${metrics.todayOrders}</li>
        <li><strong>Ingresos del Día:</strong> S/ ${metrics.todayRevenue.toFixed(2)}</li>
        <li><strong>Pedidos Activos:</strong> ${metrics.activeOrders}</li>
        <li><strong>Tiempo Promedio de Entrega:</strong> ${metrics.averageDeliveryTime} minutos</li>
      </ul>
      <h3>Pedidos por Estado:</h3>
      <ul>
        <li>Recibidos: ${metrics.ordersByStatus.recibido}</li>
        <li>Cocinando: ${metrics.ordersByStatus.cocinando}</li>
        <li>Empacados: ${metrics.ordersByStatus.empacado}</li>
        <li>En Camino: ${metrics.ordersByStatus.en_camino}</li>
        <li>Entregados: ${metrics.ordersByStatus.entregado}</li>
        <li>Cancelados: ${metrics.ordersByStatus.cancelado}</li>
      </ul>
    `;

    const payload = {
      body: JSON.stringify({
        to: adminEmail,
        subject,
        body,
        type: 'DAILY_METRICS'
      })
    };

    const command = new InvokeCommand({
      FunctionName: NOTIFICATIONS_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    console.log(`✅ Reporte diario enviado a ${adminEmail}`);
  } catch (error) {
    console.error('❌ Error al enviar reporte diario:', error);
  }
}

module.exports = {
  sendOrderNotification,
  notifyOrderAssignment,
  sendDailyMetricsEmail
};
