const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  console.log('📧 Sending review reminder:', JSON.stringify(event, null, 2));

  try {
    const { orderId, customerId, customerEmail } = event;

    // Obtener información del pedido
    const orderResult = await dynamodb.get({
      TableName: ORDERS_TABLE,
      Key: { id: orderId }
    }).promise();

    if (!orderResult.Item) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderResult.Item;
    const customerName = order.deliveryInfo?.customerName || order.customerName || 'Cliente';
    const email = customerEmail || order.deliveryInfo?.email || order.customerEmail;

    if (!email) {
      console.log('⚠️ No email found, skipping reminder');
      return {
        ...event,
        reminderSent: false,
        reason: 'No email available'
      };
    }

    const shortOrderId = orderId.substring(0, 8);
    const reviewUrl = `https://main.d2xwoa8ai8dqr9.amplifyapp.com/review/${orderId}`;

    const emailParams = {
      Source: 'brayan.gomero@unmsm.edu.pe',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `¡No olvides dejar tu reseña! 🌟 - Pedido #${shortOrderId}`
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                  .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .stars { font-size: 32px; margin: 20px 0; }
                  .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">🍕 Pizza Hut</h1>
                    <p style="margin: 10px 0; font-size: 18px;">Tu opinión nos importa</p>
                  </div>
                  
                  <div class="content">
                    <h2>Hola ${customerName},</h2>
                    
                    <p>Notamos que aún no has dejado tu reseña sobre el pedido <strong>#${shortOrderId}</strong>.</p>
                    
                    <div style="text-align: center;">
                      <div class="stars">⭐⭐⭐⭐⭐</div>
                    </div>
                    
                    <p>Solo te tomará un momento y nos ayudará a mejorar nuestro servicio para ti y otros clientes.</p>
                    
                    <div style="text-align: center;">
                      <a href="${reviewUrl}" class="button">
                        📝 Dejar Reseña Ahora
                      </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #fee2e2; border-radius: 8px; text-align: center;">
                      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                        ✨ ¡Déjanos tu reseña y recibe un cupón de descuento! ✨
                      </p>
                      <p style="margin: 10px 0 0 0; color: #991b1b;">
                        10% de descuento en tu próximo pedido
                      </p>
                    </div>
                    
                    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                      Gracias por elegir Pizza Hut. Tu satisfacción es nuestra prioridad.
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p>Este es un recordatorio amigable. No es necesario responder este email.</p>
                    <p>© 2025 Pizza Hut - Sistema de Pedidos Serverless</p>
                  </div>
                </div>
              </body>
              </html>
            `
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise();
    console.log('✅ Review reminder sent successfully');

    return {
      ...event,
      reminderSent: true,
      reminderTimestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error sending review reminder:', error);
    throw error;
  }
};
