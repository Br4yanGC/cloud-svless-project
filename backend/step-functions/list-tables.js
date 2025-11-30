const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB({ region: 'us-east-1' });

async function listTables() {
  try {
    const result = await dynamodb.listTables().promise();
    console.log('\n📊 DynamoDB Tables in us-east-1:');
    result.TableNames.forEach(name => {
      console.log(' -', name);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

listTables();
