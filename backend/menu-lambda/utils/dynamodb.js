const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  }
});

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'Products';

// Crear producto
const createProduct = async (product) => {
  await docClient.send(new PutCommand({
    TableName: PRODUCTS_TABLE,
    Item: product
  }));
  return product;
};

// Obtener producto por ID
const getProductById = async (id) => {
  const result = await docClient.send(new GetCommand({
    TableName: PRODUCTS_TABLE,
    Key: { id }
  }));
  return result.Item;
};

// Listar todos los productos
const listAllProducts = async () => {
  const result = await docClient.send(new ScanCommand({
    TableName: PRODUCTS_TABLE
  }));
  
  // Ordenar por categoría y nombre
  return (result.Items || []).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
};

// Listar productos por categoría
const listProductsByCategory = async (category) => {
  const result = await docClient.send(new QueryCommand({
    TableName: PRODUCTS_TABLE,
    IndexName: 'CategoryIndex',
    KeyConditionExpression: 'category = :category',
    ExpressionAttributeValues: {
      ':category': category
    }
  }));
  
  return (result.Items || []).sort((a, b) => a.name.localeCompare(b.name));
};

// Actualizar producto
const updateProduct = async (id, product) => {
  await docClient.send(new PutCommand({
    TableName: PRODUCTS_TABLE,
    Item: {
      ...product,
      id,
      updatedAt: new Date().toISOString()
    }
  }));
  return product;
};

// Eliminar producto
const deleteProduct = async (id) => {
  await docClient.send(new DeleteCommand({
    TableName: PRODUCTS_TABLE,
    Key: { id }
  }));
  return { id };
};

module.exports = {
  createProduct,
  getProductById,
  listAllProducts,
  listProductsByCategory,
  updateProduct,
  deleteProduct
};
