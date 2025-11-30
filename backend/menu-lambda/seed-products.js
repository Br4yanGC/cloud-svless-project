const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const PRODUCTS_TABLE = 'restaurant-menu-service-products-dev';
const S3_BASE_URL = 'https://restaurant-product-images-dev.s3.amazonaws.com/products';

const products = [
  {
    name: 'Pizza Pepperoni Grande',
    description: 'Deliciosa pizza con pepperoni y queso mozzarella',
    price: 45.90,
    category: 'pizzas',
    imageUrl: `${S3_BASE_URL}/pizza-pepperoni.jpg`,
    available: true
  },
  {
    name: 'Pizza Hawaiana Mediana',
    description: 'Piña, jamón y queso mozzarella',
    price: 38.90,
    category: 'pizzas',
    imageUrl: `${S3_BASE_URL}/pizza-hawaiana.jpg`,
    available: true
  },
  {
    name: 'Coca Cola 1.5L',
    description: 'Bebida refrescante',
    price: 8.50,
    category: 'bebidas',
    imageUrl: `${S3_BASE_URL}/coca-cola.jpg`,
    available: true
  },
  {
    name: 'Alitas BBQ (8 unidades)',
    description: 'Alitas de pollo bañadas en salsa BBQ',
    price: 25.90,
    category: 'entradas',
    imageUrl: `${S3_BASE_URL}/alitas.jpg`,
    available: true
  },
  {
    name: 'Brownie con Helado',
    description: 'Brownie caliente con helado de vainilla',
    price: 15.90,
    category: 'postres',
    imageUrl: `${S3_BASE_URL}/brownie.jpg`,
    available: true
  },
  {
    name: 'Combo Familiar',
    description: '2 Pizzas grandes + 2 bebidas 1.5L',
    price: 89.90,
    category: 'combos',
    imageUrl: `${S3_BASE_URL}/combo-familiar.jpg`,
    available: true
  }
];

async function seedProducts() {
  console.log('🌱 Sembrando productos en DynamoDB...\n');

  for (const product of products) {
    try {
      const item = {
        id: uuidv4(),
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamodb.put({
        TableName: PRODUCTS_TABLE,
        Item: item
      }).promise();

      console.log(`✅ ${product.name}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Imagen: ${product.imageUrl}\n`);

    } catch (error) {
      console.error(`❌ Error creando ${product.name}:`, error.message);
    }
  }

  console.log('✅ Todos los productos fueron creados!');
}

seedProducts();
