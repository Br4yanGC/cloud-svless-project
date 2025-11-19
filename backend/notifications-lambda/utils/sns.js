const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: 'us-east-1' });

/**
 * Enviar SMS usando AWS SNS
 * @param {string} phoneNumber - Número de teléfono en formato E.164 (+51999999999)
 * @param {string} message - Mensaje a enviar
 */
async function sendSMS(phoneNumber, message) {
  // Validar formato de teléfono
  if (!phoneNumber.startsWith('+')) {
    throw new Error('El número de teléfono debe estar en formato E.164 (+51999999999)');
  }

  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: 'AlertaUTEC'
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional' // Para mensajes importantes
      }
    }
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log('SMS enviado exitosamente:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error al enviar SMS:', error);
    throw error;
  }
}

/**
 * Enviar notificación de asignación de incidente por SMS
 */
async function sendIncidentAssignmentSMS(adminPhone, incidentId, incidentDescription) {
  const message = `AlertaUTEC: Se te ha asignado el incidente ${incidentId}. Descripción: ${incidentDescription.substring(0, 100)}${incidentDescription.length > 100 ? '...' : ''}`;
  return await sendSMS(adminPhone, message);
}

module.exports = {
  sendSMS,
  sendIncidentAssignmentSMS
};
