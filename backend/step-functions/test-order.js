const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const orderId = 'a96a987e-7d6f-47df-949c-9a2a70b1ffaa'; // ID del pedido #a96a987e

async function checkOrder() {
  try {
    const result = await dynamodb.get({
      TableName: 'restaurant-orders-dev',
      Key: { id: orderId }
    }).promise();

    console.log('\n📦 Order Data:');
    console.log('ID:', result.Item.id);
    console.log('Status:', result.Item.status);
    console.log('Reviewable:', result.Item.reviewable);
    console.log('ReviewEnabledAt:', result.Item.reviewEnabledAt);
    console.log('ReviewSubmitted:', result.Item.reviewSubmitted);
    console.log('DeliveredAt:', result.Item.deliveredAt);
    console.log('\n🔍 Full Item:');
    console.log(JSON.stringify(result.Item, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrder();
