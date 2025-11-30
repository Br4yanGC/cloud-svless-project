const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const PRODUCTS_TABLE = 'restaurant-menu-service-products-dev';
const S3_BASE_URL = 'https://restaurant-product-images-dev.s3.amazonaws.com/products';

// Mapeo de productos a imágenes
const productImageMapping = {
  'Pizza Pepperoni Grande': 'pizza-pepperoni.jpg',
  'Pizza Hawaiana Mediana': 'pizza-hawaiana.jpg',
  'Coca Cola 1.5L': 'coca-cola.jpg',
  'Alitas BBQ (8 unidades)': 'alitas.jpg',
  'Brownie con Helado': 'brownie.jpg',
  'Combo Familiar': 'combo-familiar.jpg'
};

async function updateProductImages() {
  console.log('🔄 Actualizando imágenes de productos en DynamoDB...\n');

  try {
    // Obtener todos los productos
    const result = await dynamodb.scan({
      TableName: PRODUCTS_TABLE
    }).promise();

    console.log(`📦 Encontrados ${result.Items.length} productos\n`);

    for (const product of result.Items) {
      const imageName = productImageMapping[product.name];
      
      if (imageName) {
        const imageUrl = `${S3_BASE_URL}/${imageName}`;
        
        // Actualizar el producto
        await dynamodb.update({
          TableName: PRODUCTS_TABLE,
          Key: { id: product.id },
          UpdateExpression: 'SET imageUrl = :imageUrl',
          ExpressionAttributeValues: {
            ':imageUrl': imageUrl
          }
        }).promise();

        console.log(`✅ ${product.name}`);
        console.log(`   → ${imageUrl}\n`);
      } else {
        console.log(`⚠️  ${product.name} - No se encontró imagen de mapeo\n`);
      }
    }

    console.log('✅ Actualización completada!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateProductImages();
