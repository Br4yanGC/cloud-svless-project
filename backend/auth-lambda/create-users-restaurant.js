const axios = require('axios');

const API_URL = 'https://tcb2i6e738.execute-api.us-east-1.amazonaws.com/dev';

// 5 usuarios para el sistema de restaurante
const RESTAURANT_USERS = [
  {
    name: 'Cliente Demo',
    email: 'cliente@restaurant.com',
    password: 'Cliente123!',
    role: 'cliente',
    phoneNumber: '+51999888777'
  },
  {
    name: 'Chef Mario',
    email: 'cocinero@restaurant.com',
    password: 'Cocinero123!',
    role: 'cocinero',
    phoneNumber: '+51999888666'
  },
  {
    name: 'Pedro Despachador',
    email: 'despachador@restaurant.com',
    password: 'Despachador123!',
    role: 'despachador',
    phoneNumber: '+51999888555'
  },
  {
    name: 'Luis Repartidor',
    email: 'repartidor@restaurant.com',
    password: 'Repartidor123!',
    role: 'repartidor',
    phoneNumber: '+51999888444'
  },
  {
    name: 'Admin Restaurant',
    email: 'admin@restaurant.com',
    password: 'Admin123!',
    role: 'admin',
    phoneNumber: '+51999888333'
  }
];

async function createUsers() {
  console.log('🌱 Creando usuarios del sistema de restaurante...\n');

  for (const user of RESTAURANT_USERS) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, user);
      console.log(`✅ Usuario creado: ${user.email} (${user.role})`);
      console.log(`   ID: ${response.data.user.id}\n`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log(`⚠️  Usuario ya existe: ${user.email}\n`);
      } else {
        console.error(`❌ Error creando ${user.email}:`, error.response?.data || error.message);
      }
    }
  }

  console.log('\n📋 Credenciales de acceso:\n');
  console.log('CLIENTE:');
  console.log('  Email: cliente@restaurant.com');
  console.log('  Password: Cliente123!\n');
  
  console.log('COCINERO:');
  console.log('  Email: cocinero@restaurant.com');
  console.log('  Password: Cocinero123!\n');
  
  console.log('DESPACHADOR:');
  console.log('  Email: despachador@restaurant.com');
  console.log('  Password: Despachador123!\n');
  
  console.log('REPARTIDOR:');
  console.log('  Email: repartidor@restaurant.com');
  console.log('  Password: Repartidor123!\n');
  
  console.log('ADMIN:');
  console.log('  Email: admin@restaurant.com');
  console.log('  Password: Admin123!\n');
}

createUsers();
