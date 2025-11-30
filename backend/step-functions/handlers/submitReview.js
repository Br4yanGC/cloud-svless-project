const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const eventbridge = new AWS.EventBridge();

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const REVIEWS_TABLE = process.env.REVIEWS_TABLE;

exports.handler = async (event) => {
  console.log('📝 Submitting review:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body);
    const { orderId, customerId, rating, comment, hasComplaint, complaintText } = body;

    // Validaciones
    if (!orderId || !customerId || !rating) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'orderId, customerId, and rating are required'
        })
      };
    }

    if (rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'rating must be between 1 and 5'
        })
      };
    }

    // Verificar que el pedido existe y está entregado
    const orderResult = await dynamodb.get({
      TableName: ORDERS_TABLE,
      Key: { id: orderId }
    }).promise();

    if (!orderResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'Order not found'
        })
      };
    }

    if (orderResult.Item.status !== 'entregado') {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'Can only review delivered orders'
        })
      };
    }

    if (orderResult.Item.reviewSubmitted) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          error: 'Review already submitted for this order'
        })
      };
    }

    // Crear la reseña
    const reviewId = uuidv4();
    const now = new Date().toISOString();

    const review = {
      id: reviewId,
      orderId,
      customerId,
      rating,
      comment: comment || '',
      hasComplaint: hasComplaint || false,
      complaintText: complaintText || null,
      createdAt: now,
      updatedAt: now
    };

    // Guardar reseña en DynamoDB
    await dynamodb.put({
      TableName: REVIEWS_TABLE,
      Item: review
    }).promise();

    // Actualizar el pedido
    await dynamodb.update({
      TableName: ORDERS_TABLE,
      Key: { id: orderId },
      UpdateExpression: 'SET reviewSubmitted = :true, reviewId = :reviewId, reviewedAt = :now',
      ExpressionAttributeValues: {
        ':true': true,
        ':reviewId': reviewId,
        ':now': now
      }
    }).promise();

    // Publicar evento
    await eventbridge.putEvents({
      Entries: [{
        Source: 'restaurant.reviews',
        DetailType: hasComplaint ? 'ReviewSubmittedWithComplaint' : 'ReviewSubmitted',
        Detail: JSON.stringify({
          reviewId,
          orderId,
          customerId,
          rating,
          hasComplaint,
          createdAt: now
        }),
        EventBusName: `restaurant-events-${process.env.STAGE}`
      }]
    }).promise();

    console.log('✅ Review submitted successfully:', reviewId);

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Review submitted successfully',
        review
      })
    };

  } catch (error) {
    console.error('❌ Error submitting review:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: 'Failed to submit review',
        details: error.message
      })
    };
  }
};
