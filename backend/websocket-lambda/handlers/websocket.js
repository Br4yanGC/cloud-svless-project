const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// Handler: Cuando un cliente se conecta
module.exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  // Extraer userId del query string si está disponible
  const userId = event.queryStringParameters?.userId || null;
  const userRole = event.queryStringParameters?.role || 'guest';

  try {
    await docClient.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        userId,
        userRole,
        connectedAt: new Date().toISOString()
      }
    }));

    console.log(`✅ Cliente conectado: ${connectionId}, userId: ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Conectado' })
    };
  } catch (error) {
    console.error('❌ Error al conectar:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al conectar' })
    };
  }
};

// Handler: Cuando un cliente se desconecta
module.exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await docClient.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }));

    console.log(`✅ Cliente desconectado: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Desconectado' })
    };
  } catch (error) {
    console.error('❌ Error al desconectar:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al desconectar' })
    };
  }
};

// Handler: Cuando un cliente envía un mensaje
module.exports.message = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body);

  console.log(`📩 Mensaje recibido de ${connectionId}:`, body);

  // Aquí puedes manejar diferentes tipos de mensajes
  // Por ejemplo: subscripción a notificaciones, ping/pong, etc.

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Mensaje recibido' })
  };
};

// Handler: Broadcast de notificación a todos los clientes conectados
module.exports.broadcast = async (event) => {
  console.log('📢 Broadcast invocado. Event:', JSON.stringify(event));
  
  const { message, targetRole, targetUserId } = JSON.parse(event.body);
  
  console.log('📢 Broadcast params:', { message, targetRole, targetUserId });

  const endpoint = process.env.WEBSOCKET_ENDPOINT;
  console.log('📢 WebSocket endpoint:', endpoint);
  
  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: endpoint
  });

  try {
    // Obtener todas las conexiones
    let connections;
    
    if (targetUserId) {
      // Enviar solo a un usuario específico
      console.log('🔍 Buscando conexiones con userId:', targetUserId);
      const result = await docClient.send(new QueryCommand({
        TableName: CONNECTIONS_TABLE,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': targetUserId
        }
      }));
      connections = result.Items;
      console.log('🔍 Conexiones encontradas para userId:', connections.length, connections);
    } else if (targetRole) {
      // Enviar a todos de un rol específico
      console.log('🔍 Buscando conexiones con rol:', targetRole);
      const result = await docClient.send(new ScanCommand({
        TableName: CONNECTIONS_TABLE,
        FilterExpression: 'userRole = :role',
        ExpressionAttributeValues: {
          ':role': targetRole
        }
      }));
      connections = result.Items;
      console.log('🔍 Conexiones encontradas:', connections.length, connections);
    } else {
      // Enviar a todos
      const result = await docClient.send(new ScanCommand({
        TableName: CONNECTIONS_TABLE
      }));
      connections = result.Items;
    }

    // Enviar mensaje a cada conexión
    const sendPromises = connections.map(async ({ connectionId }) => {
      try {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message)
        }));
        console.log(`✅ Mensaje enviado a ${connectionId}`);
      } catch (error) {
        if (error.statusCode === 410) {
          // Conexión obsoleta, eliminarla
          console.log(`🗑️ Eliminando conexión obsoleta: ${connectionId}`);
          await docClient.send(new DeleteCommand({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId }
          }));
        } else {
          console.error(`❌ Error al enviar a ${connectionId}:`, error);
        }
      }
    });

    await Promise.all(sendPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Notificación enviada',
        recipients: connections.length
      })
    };
  } catch (error) {
    console.error('❌ Error en broadcast:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al enviar notificación' })
    };
  }
};
