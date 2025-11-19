const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Cliente DynamoDB
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE;

// Crear usuario
async function createUser({ email, passwordHash, name, role, code, email_notification }) {
  const user = {
    id: randomUUID(),
    email,
    passwordHash,
    name,
    role,
    code,
    email_notification: email_notification || email, // Por defecto, usar el mismo email
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)'
  });

  await docClient.send(command);
  return user;
}

// Obtener usuario por ID
async function getUser(id) {
  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { id }
  });

  const response = await docClient.send(command);
  return response.Item;
}

// Obtener usuario por email (usando GSI)
async function getUserByEmail(email) {
  const command = new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  });

  const response = await docClient.send(command);
  return response.Items?.[0] || null;
}

// Actualizar último login (opcional)
async function updateLastLogin(id) {
  const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
  
  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { id },
    UpdateExpression: 'SET lastLogin = :now',
    ExpressionAttributeValues: {
      ':now': new Date().toISOString()
    }
  });

  await docClient.send(command);
}

// Listar todos los administradores
async function listAdministrators() {
  const command = new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: '#role = :role',
    ExpressionAttributeNames: {
      '#role': 'role'
    },
    ExpressionAttributeValues: {
      ':role': 'administrador'
    }
  });

  const result = await docClient.send(command);
  return result.Items || [];
}

// Actualizar usuario
async function updateUser(id, updates) {
  const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
  
  // Construir la expresión de actualización dinámicamente
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  
  Object.keys(updates).forEach((key, index) => {
    const placeholder = `#field${index}`;
    const valuePlaceholder = `:val${index}`;
    
    updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
    expressionAttributeNames[placeholder] = key;
    expressionAttributeValues[valuePlaceholder] = updates[key];
  });
  
  // Agregar updatedAt
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });
  
  const response = await docClient.send(command);
  return response.Attributes;
}

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  updateLastLogin,
  listAdministrators,
  updateUser
};
