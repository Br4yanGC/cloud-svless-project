const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;

/**
 * Crear una notificación in-app
 */
async function createNotification(notification) {
  const params = {
    TableName: NOTIFICATIONS_TABLE,
    Item: notification
  };
  
  await dynamoDB.send(new PutCommand(params));
  return notification;
}

/**
 * Obtener notificaciones de un usuario
 */
async function getNotificationsByUser(userId, limit = 50) {
  const params = {
    TableName: NOTIFICATIONS_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false, // Orden descendente por createdAt
    Limit: limit
  };
  
  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Marcar notificación como leída
 */
async function markNotificationAsRead(id) {
  const params = {
    TableName: NOTIFICATIONS_TABLE,
    Key: { id },
    UpdateExpression: 'SET #read = :true, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#read': 'read'
    },
    ExpressionAttributeValues: {
      ':true': true,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamoDB.send(new UpdateCommand(params));
  return result.Attributes;
}

/**
 * Contar notificaciones no leídas
 */
async function countUnreadNotifications(userId) {
  const params = {
    TableName: NOTIFICATIONS_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    FilterExpression: '#read = :false',
    ExpressionAttributeNames: {
      '#read': 'read'
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':false': false
    },
    Select: 'COUNT'
  };
  
  const result = await dynamoDB.send(new QueryCommand(params));
  return result.Count || 0;
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
  countUnreadNotifications
};
