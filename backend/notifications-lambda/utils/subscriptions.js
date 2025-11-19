const { SNSClient, ListSubscriptionsByTopicCommand, UnsubscribeCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const snsClient = new SNSClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const TOPIC_ARN = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:119327998857:alertautec-notifications-topic';
const USERS_TABLE = 'alertautec-auth-users-dev';

/**
 * Obtener todos los admins y su estado de suscripción
 */
async function getAdminsWithSubscriptionStatus() {
  try {
    // Obtener todos los usuarios con rol administrador
    const scanCommand = new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: '#role = :adminRole',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':adminRole': 'administrador'
      }
    });

    const adminsResult = await dynamoDB.send(scanCommand);
    const admins = adminsResult.Items || [];

    // Obtener suscripciones del topic SNS
    const listSubsCommand = new ListSubscriptionsByTopicCommand({
      TopicArn: TOPIC_ARN
    });

    const subsResult = await snsClient.send(listSubsCommand);
    const subscriptions = subsResult.Subscriptions || [];

    // Mapear suscripciones por email
    const subscribedEmails = new Map();
    subscriptions.forEach(sub => {
      if (sub.Protocol === 'email') {
        // SNS marca como 'PendingConfirmation' cuando no está confirmado
        const isPending = sub.SubscriptionArn === 'PendingConfirmation' || 
                         sub.SubscriptionArn.includes('PendingConfirmation');
        subscribedEmails.set(sub.Endpoint, {
          arn: sub.SubscriptionArn,
          status: isPending ? 'pending' : 'confirmed'
        });
      }
    });

    // Combinar datos
    const adminsWithStatus = admins.map(admin => {
      const emailForNotifications = admin.email_notification || admin.email;
      const subscription = subscribedEmails.get(emailForNotifications);
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        email_notification: emailForNotifications,
        subscribed: subscription ? true : false,
        subscriptionStatus: subscription ? subscription.status : 'not_subscribed',
        subscriptionArn: subscription ? subscription.arn : null
      };
    });

    return adminsWithStatus;
  } catch (error) {
    console.error('Error al obtener admins con estado de suscripción:', error);
    throw error;
  }
}

/**
 * Cancelar suscripción
 */
async function unsubscribeEmail(subscriptionArn) {
  try {
    const command = new UnsubscribeCommand({
      SubscriptionArn: subscriptionArn
    });

    await snsClient.send(command);
    console.log(`Suscripción cancelada: ${subscriptionArn}`);
    return { success: true };
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    throw error;
  }
}

module.exports = {
  getAdminsWithSubscriptionStatus,
  unsubscribeEmail
};
