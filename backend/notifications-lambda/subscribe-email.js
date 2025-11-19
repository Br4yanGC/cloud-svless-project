const { SNSClient, SubscribeCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: 'us-east-1' });
const TOPIC_ARN = 'arn:aws:sns:us-east-1:119327998857:alertautec-notifications-topic';

async function subscribeEmail(email) {
  try {
    const command = new SubscribeCommand({
      TopicArn: TOPIC_ARN,
      Protocol: 'email',
      Endpoint: email
    });
    
    const result = await snsClient.send(command);
    console.log('✅ Solicitud de suscripción enviada exitosamente!');
    console.log('SubscriptionArn:', result.SubscriptionArn);
    console.log('\n📧 IMPORTANTE:');
    console.log(`1. Revisa tu email: ${email}`);
    console.log('2. Busca un email de "AWS Notifications"');
    console.log('3. Haz clic en el link "Confirm subscription" en el email');
    console.log('4. Una vez confirmado, recibirás notificaciones de incidentes');
    return result;
  } catch (error) {
    console.error('❌ Error al suscribir email:', error.message);
    throw error;
  }
}

// Email del administrador
const ADMIN_EMAIL = 'brayan.gomero@utec.edu.pe';

console.log(`🚀 Suscribiendo ${ADMIN_EMAIL} al topic de notificaciones...\n`);

subscribeEmail(ADMIN_EMAIL)
  .then(() => {
    console.log('\n✅ Proceso completado!');
    console.log('\nPróximos pasos:');
    console.log('1. Confirma la suscripción desde tu email');
    console.log('2. Prueba asignando un incidente desde el SuperAdmin');
    console.log('3. Deberías recibir un email con la notificación');
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso');
    console.error('Error:', error.message);
  });
