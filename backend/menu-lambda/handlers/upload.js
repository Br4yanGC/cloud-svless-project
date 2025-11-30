const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.IMAGES_BUCKET;

/**
 * Subir imagen de producto a S3
 * POST /menu/upload
 */
exports.uploadImage = async (event) => {
  console.log('📤 Upload image request:', JSON.stringify(event, null, 2));

  try {
    // Parsear el body que viene en base64
    const body = JSON.parse(event.body);
    const { image, fileName, contentType } = body;

    if (!image) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ 
          message: 'Image data is required' 
        })
      };
    }

    // Decodificar la imagen base64
    const imageBuffer = Buffer.from(image, 'base64');

    // Generar nombre único para la imagen
    const fileExtension = fileName?.split('.').pop() || 'jpg';
    const key = `products/${uuidv4()}.${fileExtension}`;

    // Subir a S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType || 'image/jpeg',
      ACL: 'public-read'
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    
    console.log('✅ Image uploaded successfully:', uploadResult.Location);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Image uploaded successfully',
        imageUrl: uploadResult.Location,
        key: key
      })
    };

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ 
        message: 'Error uploading image',
        error: error.message 
      })
    };
  }
};
