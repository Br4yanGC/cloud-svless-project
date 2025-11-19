const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const users = [
  {
    id: 'dc473025-5640-4da9-b6ab-eddd43ec3319',
    name: 'Super Administrador',
    email: 'superadmin@utec.edu.pe',
    password: 'Admin123!',
    passwordHash: '$2a$10$xbbTN9ZJvfvC6CdOjwbm8uOhdoflkruPz5yztkagQAnr1srCzE8p2',
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
    passwordHash: '$2a$10$nZW1AAjOt2yElihboRpPLugvDLQXjrdH7E8O6PG5XCa5CMFz1/lnO',
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
    passwordHash: '$2a$10$t2xoH0sbsC/WSECdsVc0TOwd0vRL8GdTmhgVYGlIPYPHI74Z/YT/e',
    role: 'estudiante',
    email_notification: 'brayan.gomero@utec.edu.pe',
    code: '202100001',
    phoneNumber: null
  }
];

async function createUsers() {
  console.log('🌱 Creando usuarios...');
  
  for (const userData of users) {
    try {
      const { password, ...user } = userData;
      user.createdAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();

      await dynamoDB.send(new PutCommand({
        TableName: 'alertautec-auth-v2-users-dev',
        Item: user
      }));

      console.log(`✅ Usuario creado: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creando ${userData.email}:`, error.message);
    }
  }
  
  console.log('🎉 Proceso completado');
}

createUsers();
