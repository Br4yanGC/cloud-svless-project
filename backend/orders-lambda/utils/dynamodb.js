const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  }
});

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Orders';

// Crear pedido
const createOrder = async (order) => {
  await docClient.send(new PutCommand({
    TableName: ORDERS_TABLE,
    Item: order
  }));
  return order;
};

// Obtener pedido por ID
const getOrderById = async (id) => {
  const result = await docClient.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: { id }
  }));
  return result.Item;
};

// Listar todos los pedidos
const listAllOrders = async (limit = 50) => {
  const result = await docClient.send(new ScanCommand({
    TableName: ORDERS_TABLE,
    Limit: limit
  }));
  
  // Ordenar por fecha de creación (más recientes primero)
  return (result.Items || []).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
};

// Listar pedidos por cliente
const listOrdersByCustomer = async (customerId, limit = 50) => {
  const result = await docClient.send(new QueryCommand({
    TableName: ORDERS_TABLE,
    IndexName: 'CustomerIdIndex',
    KeyConditionExpression: 'customerId = :customerId',
    ExpressionAttributeValues: {
      ':customerId': customerId
    },
    ScanIndexForward: false, // Orden descendente por fecha
    Limit: limit
  }));
  return result.Items;
};

// Listar pedidos por asignado (cocinero, despachador, repartidor)
const listOrdersByAssignee = async (assigneeId, limit = 50) => {
  // Buscar en todos los pedidos donde el usuario esté asignado
  const result = await docClient.send(new ScanCommand({
    TableName: ORDERS_TABLE,
    FilterExpression: 'cook.id = :assigneeId OR packer.id = :assigneeId OR deliveryPerson.id = :assigneeId',
    ExpressionAttributeValues: {
      ':assigneeId': assigneeId
    },
    Limit: limit
  }));
  
  return (result.Items || []).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
};

// Listar pedidos por estado
const listOrdersByStatus = async (status, limit = 50) => {
  const result = await docClient.send(new QueryCommand({
    TableName: ORDERS_TABLE,
    IndexName: 'StatusIndex',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status
    },
    ScanIndexForward: false, // Orden descendente por fecha
    Limit: limit
  }));
  return result.Items;
};

// Actualizar pedido
const updateOrder = async (id, order) => {
  await docClient.send(new PutCommand({
    TableName: ORDERS_TABLE,
    Item: {
      ...order,
      id,
      updatedAt: new Date().toISOString()
    }
  }));
  return order;
};

// Eliminar pedido
const deleteOrder = async (id) => {
  await docClient.send(new DeleteCommand({
    TableName: ORDERS_TABLE,
    Key: { id }
  }));
  return { id };
};

// Buscar pedidos por número de pedido
const getOrderByOrderNumber = async (orderNumber) => {
  const result = await docClient.send(new QueryCommand({
    TableName: ORDERS_TABLE,
    IndexName: 'OrderNumberIndex',
    KeyConditionExpression: 'orderNumber = :orderNumber',
    ExpressionAttributeValues: {
      ':orderNumber': orderNumber
    },
    Limit: 1
  }));
  return result.Items ? result.Items[0] : null;
};

module.exports = {
  createOrder,
  getOrderById,
  getOrderByOrderNumber,
  listAllOrders,
  listOrdersByCustomer,
  listOrdersByAssignee,
  listOrdersByStatus,
  updateOrder,
  deleteOrder
};
