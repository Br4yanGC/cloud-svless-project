const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({ region: 'us-east-1' });
const BUCKET_NAME = 'restaurant-product-images-dev';

// URLs de imágenes de muestra (placeholder)
const sampleImages = [
  {
    name: 'pizza-pepperoni.jpg',
    url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80'
  },
  {
    name: 'pizza-hawaiana.jpg',
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80'
  },
  {
    name: 'coca-cola.jpg',
    url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500&q=80'
  },
  {
    name: 'alitas.jpg',
    url: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&q=80'
  },
  {
    name: 'brownie.jpg',
    url: 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=500&q=80'
  },
  {
    name: 'combo-familiar.jpg',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'
  }
];

async function uploadSampleImages() {
  console.log('📤 Uploading sample images to S3...\n');

  for (const image of sampleImages) {
    try {
      // Descargar imagen desde URL
      const https = require('https');
      const imageBuffer = await new Promise((resolve, reject) => {
        https.get(image.url, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
      });

      // Subir a S3
      const key = `products/${image.name}`;
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read'
      };

      const result = await s3.upload(uploadParams).promise();
      console.log(`✅ ${image.name}: ${result.Location}`);

    } catch (error) {
      console.error(`❌ Error uploading ${image.name}:`, error.message);
    }
  }

  console.log('\n✅ All images uploaded successfully!');
}

uploadSampleImages();
