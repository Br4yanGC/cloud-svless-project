const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE;

// 3 usuarios por defecto (idénticos a los actuales en DB)
const DEFAULT_USERS = [
  {
    id: 'dc473025-5640-4da9-b6ab-eddd43ec3319',
    name: 'Super Administrador',
    email: 'superadmin@utec.edu.pe',
    password: 'Admin123!',
    role: 'superadmin',
    email_notification: 'brayan.gomero@utec.edu.pe',
    code: null,
    phoneNumber: null
  },
  {
    id: '6d54446a-68d0-4097-901b-b65e8cb8c65e',
    name: 'Admin UTEC',
    email: 'admin@utec.edu.pe',
    password: 'Admin123!',
    role: 'administrador',
    email_notification: 'brayan.gomero@utec.edu.pe',
    code: null,
    phoneNumber: '+51912774117'
  },
  {
    id: '4b67425b-c0d6-4483-8425-a268b049d159',
    name: 'Estudiante UTEC',
    email: 'estudiante@utec.edu.pe',
    password: 'Admin123!',
    role: 'estudiante',
    email_notification: 'brayan.gomero@utec.edu.pe',
    code: '202100001',
    phoneNumber: null
  }
];

/**
 * Lambda que se ejecuta automáticamente después del deploy
 * para crear usuarios por defecto si no existen
 */
exports.handler = async (event, context) => {
  console.log('🌱 Iniciando seed de usuarios por defecto...');
  console.log('Event:', JSON.stringify(event, null, 2));

  // CloudFormation Custom Resource
  const responseData = {};
  const physicalResourceId = 'SeedUsersResource';

  try {
    // Solo ejecutar en CREATE o UPDATE
    if (event.RequestType === 'Delete') {
      console.log('DELETE request - no action needed');
      await sendResponse(event, context, 'SUCCESS', responseData, physicalResourceId);
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const userData of DEFAULT_USERS) {
      // Verificar si el usuario ya existe
      const existingUser = await getUserByEmail(userData.email);
      
      if (existingUser) {
        console.log(`⏭️ Usuario ${userData.email} ya existe, omitiendo...`);
        skipped++;
        continue;
      }

      // Crear usuario
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role,
        email_notification: userData.email_notification,
        code: userData.code,
        phoneNumber: userData.phoneNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDB.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: user,
        ConditionExpression: 'attribute_not_exists(email)'
      }));

      console.log(`✅ Usuario ${userData.email} creado exitosamente`);
      created++;
    }

    const message = `Seed completado: ${created} usuarios creados, ${skipped} ya existían`;
    console.log(`🎉 ${message}`);

    responseData.message = message;
    responseData.created = created;
    responseData.skipped = skipped;

    // Responder a CloudFormation
    await sendResponse(event, context, 'SUCCESS', responseData, physicalResourceId);

  } catch (error) {
    console.error('❌ Error en seed:', error);
    await sendResponse(event, context, 'FAILED', { error: error.message }, physicalResourceId);
    throw error;
  }
};

/**
 * Obtener usuario por email
 */
async function getUserByEmail(email) {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { email },
      IndexName: 'EmailIndex'
    }));
    return result.Item || null;
  } catch (error) {
    // Si el índice no existe aún, continuar
    if (error.name === 'ResourceNotFoundException') {
      return null;
    }
    throw error;
  }
}

/**
 * Enviar respuesta a CloudFormation
 */
async function sendResponse(event, context, responseStatus, responseData, physicalResourceId) {
  if (!event.ResponseURL) {
    console.log('No ResponseURL - skipping CloudFormation response');
    return;
  }

  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: physicalResourceId || context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log('Response body:', responseBody);

  const https = require('https');
  const url = require('url');

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      console.log(`Status code: ${response.statusCode}`);
      console.log(`Status message: ${response.statusMessage}`);
      resolve();
    });

    request.on('error', (error) => {
      console.log(`send(..) failed: ${error}`);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
