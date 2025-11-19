const { SNSClient, PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: 'us-east-1' });

// Topic ARN desde variables de entorno
const TOPIC_ARN = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:119327998857:alertautec-notifications-topic';

/**
 * Suscribir un email al topic SNS (si no está suscrito)
 * AWS enviará un email de confirmación que el usuario debe aceptar
 */
async function subscribeEmailToTopic(email) {
  try {
    // Verificar si ya está suscrito
    const listCommand = new ListSubscriptionsByTopicCommand({
      TopicArn: TOPIC_ARN
    });
    const subscriptions = await snsClient.send(listCommand);
    
    const alreadySubscribed = subscriptions.Subscriptions.some(
      sub => sub.Endpoint === email && sub.Protocol === 'email'
    );
    
    if (alreadySubscribed) {
      console.log(`Email ${email} ya está suscrito al topic`);
      return { alreadySubscribed: true };
    }
    
    // Suscribir el email
    const subscribeCommand = new SubscribeCommand({
      TopicArn: TOPIC_ARN,
      Protocol: 'email',
      Endpoint: email
    });
    
    const result = await snsClient.send(subscribeCommand);
    console.log(`✅ Solicitud de suscripción enviada a ${email}`);
    console.log(`El usuario debe confirmar en su email`);
    return result;
  } catch (error) {
    console.error('Error al suscribir email:', error);
    throw error;
  }
}

/**
 * Enviar email a través de SNS Topic
 */
async function sendEmail(subject, message) {
  const params = {
    TopicArn: TOPIC_ARN,
    Subject: subject,
    Message: message
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log('✅ Email enviado a través de SNS Topic:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
}

/**
 * Enviar notificación de asignación de incidente por Email (SNS)
 */
async function sendIncidentAssignmentEmail(adminEmail, adminName, incidentId, incidentDescription) {
  const subject = `🚨 Nuevo Incidente Asignado - ${incidentId}`;
  
  const message = `
AlertaUTEC - Notificación de Incidente
═══════════════════════════════════════

Hola ${adminName},

Se te ha asignado un nuevo incidente que requiere tu atención inmediata.

📋 Incidente: ${incidentId}
📝 Descripción: ${incidentDescription}

Por favor, ingresa a la plataforma para revisar los detalles y tomar acción:
👉 https://main.d2w7yrgd5oyrky.amplifyapp.com/

═══════════════════════════════════════
Este es un correo automático de AlertaUTEC
Universidad de Ingeniería y Tecnología
© 2025
  `.trim();
  
  return await sendEmail(subject, message);
}

module.exports = {
  sendEmail,
  sendIncidentAssignmentEmail,
  subscribeEmailToTopic
};
