const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.IMAGES_BUCKET;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Upload Image
 * POST /products/images/upload
 * Body: { image: base64String, fileName: string, contentType: string }
 */
exports.uploadImage = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { image, fileName, contentType = 'image/jpeg' } = body;

    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Image data is required' })
      };
    }

    // Generate unique key
    const fileExtension = contentType.split('/')[1] || 'jpg';
    const key = `products/${uuidv4()}-${Date.now()}.${fileExtension}`;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      ACL: 'public-read'
    });

    await s3Client.send(command);

    // Generate public URL
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Image uploaded successfully',
        imageUrl,
        key
      })
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error uploading image',
        error: error.message 
      })
    };
  }
};

/**
 * Get Image (Generate signed URL)
 * GET /products/images/{key}
 */
exports.getImage = async (event) => {
  try {
    const key = event.pathParameters.key;

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Image key is required' })
      };
    }

    // Generate signed URL válida por 1 hora
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `products/${key}`
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url: signedUrl,
        key
      })
    };
  } catch (error) {
    console.error('Error getting image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error getting image',
        error: error.message 
      })
    };
  }
};

/**
 * Delete Image
 * DELETE /products/images/{key}
 */
exports.deleteImage = async (event) => {
  try {
    const key = event.pathParameters.key;

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Image key is required' })
      };
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `products/${key}`
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Image deleted successfully',
        key
      })
    };
  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error deleting image',
        error: error.message 
      })
    };
  }
};
