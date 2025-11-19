const { v4: uuidv4 } = require('uuid');
const {
  createNotification,
  getNotificationsByUser,
  markNotificationAsRead,
  countUnreadNotifications
} = require('../utils/dynamodb');
const { sendEmail, sendIncidentAssignmentEmail, subscribeEmailToTopic } = require('../utils/ses');
const { getAdminsWithSubscriptionStatus, unsubscribeEmail } = require('../utils/subscriptions');

const success = (statusCode, data) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});

const error = (statusCode, message) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ error: message })
});

/**
 * Crear una notificación in-app
 */
module.exports.create = async (event) => {
  try {
    const { userId, title, message, type, metadata } = JSON.parse(event.body);

    if (!userId || !title || !message) {
      return error(400, 'Campos requeridos: userId, title, message');
    }

    const notification = {
      id: uuidv4(),
      userId,
      title,
      message,
      type: type || 'info', // info, success, warning, error
      metadata: metadata || {},
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createNotification(notification);
    return success(201, notification);
  } catch (err) {
    console.error('Error al crear notificación:', err);
    return error(500, 'Error al crear notificación');
  }
};

/**
 * Listar notificaciones de un usuario
 */
module.exports.list = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const limit = event.queryStringParameters?.limit || 50;

    const notifications = await getNotificationsByUser(userId, parseInt(limit));
    const unreadCount = await countUnreadNotifications(userId);

    return success(200, {
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (err) {
    console.error('Error al listar notificaciones:', err);
    return error(500, 'Error al listar notificaciones');
  }
};

/**
 * Marcar notificación como leída
 */
module.exports.markAsRead = async (event) => {
  try {
    const { id } = event.pathParameters;

    const updatedNotification = await markNotificationAsRead(id);
    return success(200, updatedNotification);
  } catch (err) {
    console.error('Error al marcar notificación como leída:', err);
    return error(500, 'Error al marcar notificación como leída');
  }
};

/**
 * Enviar Email vía SNS
 */
module.exports.sendEmail = async (event) => {
  try {
    const { email, name, incidentId, incidentDescription, subject, message } = JSON.parse(event.body);

    let result;
    if (incidentId && incidentDescription && name) {
      // Enviar notificación de incidente al topic SNS
      result = await sendIncidentAssignmentEmail(email, name, incidentId, incidentDescription);
      
      return success(200, {
        success: true,
        messageId: result.MessageId,
        message: 'Email enviado exitosamente a todos los suscritos del topic'
      });
    } else if (subject && message) {
      // Enviar mensaje genérico al topic
      result = await sendEmail(subject, message);
      
      return success(200, {
        success: true,
        messageId: result.MessageId,
        message: 'Email enviado exitosamente'
      });
    } else {
      return error(400, 'Campos requeridos: (email, name, incidentId, incidentDescription) o (subject, message)');
    }
  } catch (err) {
    console.error('Error al enviar Email:', err);
    return error(500, err.message || 'Error al enviar Email');
  }
};

/**
 * Listar admins y su estado de suscripción
 */
module.exports.listSubscriptions = async (event) => {
  try {
    const admins = await getAdminsWithSubscriptionStatus();
    
    const summary = {
      total: admins.length,
      confirmed: admins.filter(a => a.subscriptionStatus === 'confirmed').length,
      pending: admins.filter(a => a.subscriptionStatus === 'pending').length,
      notSubscribed: admins.filter(a => a.subscriptionStatus === 'not_subscribed').length
    };

    return success(200, {
      admins,
      summary
    });
  } catch (err) {
    console.error('Error al listar suscripciones:', err);
    return error(500, err.message || 'Error al listar suscripciones');
  }
};

/**
 * Suscribir email al topic
 */
module.exports.subscribeEmail = async (event) => {
  try {
    const { email, email_notification } = JSON.parse(event.body);

    // Usar email_notification si está disponible, sino usar email
    const emailToSubscribe = email_notification || email;

    if (!emailToSubscribe) {
      return error(400, 'Campo requerido: email o email_notification');
    }

    const result = await subscribeEmailToTopic(emailToSubscribe);

    if (result.alreadySubscribed) {
      return success(200, {
        message: 'El email ya está suscrito',
        alreadySubscribed: true
      });
    }

    return success(200, {
      message: 'Invitación enviada. El usuario debe confirmar desde su email.',
      subscriptionArn: result.SubscriptionArn,
      subscribedEmail: emailToSubscribe
    });
  } catch (err) {
    console.error('Error al suscribir email:', err);
    return error(500, err.message || 'Error al suscribir email');
  }
};

/**
 * Cancelar suscripción
 */
module.exports.unsubscribe = async (event) => {
  try {
    const { subscriptionArn } = JSON.parse(event.body);

    // Validar que el ARN sea válido (debe empezar con "arn:aws:sns:")
    if (!subscriptionArn || 
        subscriptionArn === 'PendingConfirmation' || 
        !subscriptionArn.startsWith('arn:aws:sns:')) {
      return error(400, 'No se puede desuscribir: la suscripción está pendiente de confirmación o el ARN es inválido');
    }

    await unsubscribeEmail(subscriptionArn);

    return success(200, {
      message: 'Suscripción cancelada exitosamente'
    });
  } catch (err) {
    console.error('Error al cancelar suscripción:', err);
    return error(500, err.message || 'Error al cancelar suscripción');
  }
};
