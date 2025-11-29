const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * List all products
 * GET /products
 */
exports.listProducts = async (event) => {
  try {
    const params = {
      TableName: PRODUCTS_TABLE
    };

    const result = await dynamoDB.send(new ScanCommand(params));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        products: result.Items || [],
        count: result.Count
      })
    };
  } catch (error) {
    console.error('Error listing products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error listing products',
        error: error.message 
      })
    };
  }
};

/**
 * Get single product
 * GET /products/{id}
 */
exports.getProduct = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: PRODUCTS_TABLE,
      Key: { id }
    };

    const result = await dynamoDB.send(new GetCommand(params));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Product not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error getting product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error getting product',
        error: error.message 
      })
    };
  }
};

/**
 * Create product
 * POST /products
 */
exports.createProduct = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { name, description, price, category, imageUrl, available = true } = body;

    // Validations
    if (!name || !price || !category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Name, price and category are required' 
        })
      };
    }

    const product = {
      id: uuidv4(),
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      imageUrl: imageUrl || null,
      available,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: PRODUCTS_TABLE,
      Item: product
    };

    await dynamoDB.send(new PutCommand(params));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Product created successfully',
        product
      })
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error creating product',
        error: error.message 
      })
    };
  }
};

/**
 * Update product
 * PUT /products/{id}
 */
exports.updateProduct = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    // Check if product exists
    const getParams = {
      TableName: PRODUCTS_TABLE,
      Key: { id }
    };

    const existingProduct = await dynamoDB.send(new GetCommand(getParams));

    if (!existingProduct.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Product not found' })
      };
    }

    // Build update expression
    const updateFields = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (body.name !== undefined) {
      updateFields.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = body.name;
    }

    if (body.description !== undefined) {
      updateFields.push('description = :description');
      expressionAttributeValues[':description'] = body.description;
    }

    if (body.price !== undefined) {
      updateFields.push('price = :price');
      expressionAttributeValues[':price'] = parseFloat(body.price);
    }

    if (body.category !== undefined) {
      updateFields.push('category = :category');
      expressionAttributeValues[':category'] = body.category;
    }

    if (body.imageUrl !== undefined) {
      updateFields.push('imageUrl = :imageUrl');
      expressionAttributeValues[':imageUrl'] = body.imageUrl;
    }

    if (body.available !== undefined) {
      updateFields.push('available = :available');
      expressionAttributeValues[':available'] = body.available;
    }

    // Always update updatedAt
    updateFields.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateParams = {
      TableName: PRODUCTS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateFields.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      updateParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamoDB.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Product updated successfully',
        product: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error updating product',
        error: error.message 
      })
    };
  }
};

/**
 * Delete product
 * DELETE /products/{id}
 */
exports.deleteProduct = async (event) => {
  try {
    const { id } = event.pathParameters;

    // Check if product exists
    const getParams = {
      TableName: PRODUCTS_TABLE,
      Key: { id }
    };

    const existingProduct = await dynamoDB.send(new GetCommand(getParams));

    if (!existingProduct.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Product not found' })
      };
    }

    const deleteParams = {
      TableName: PRODUCTS_TABLE,
      Key: { id }
    };

    await dynamoDB.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Product deleted successfully',
        product: existingProduct.Item
      })
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error deleting product',
        error: error.message 
      })
    };
  }
};
