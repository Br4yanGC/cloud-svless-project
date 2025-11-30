const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  console.log('📧 Sending satisfaction email:', JSON.stringify(event, null, 2));

  try {
    const { orderId, customerId, detail } = event;
    
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
    const customerEmail = order.deliveryInfo?.email || order.customerEmail;

    if (!customerEmail) {
      console.log('⚠️ No email found for customer, skipping');
      return {
        orderId,
        customerId,
        emailSent: false,
        reason: 'No email available'
      };
    }

    const shortOrderId = orderId.substring(0, 8);
    const reviewUrl = `https://main.d2xwoa8ai8dqr9.amplifyapp.com/review/${orderId}`;

    const emailParams = {
      Source: 'brayan.gomero@unmsm.edu.pe',
      Destination: {
        ToAddresses: [customerEmail]
      },
      Message: {
        Subject: {
          Data: `¿Cómo estuvo tu pedido #${shortOrderId}? 🍕`
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
                  .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
                  .emoji { font-size: 48px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="emoji">🍕</div>
                    <h1 style="margin: 10px 0;">Pizza Hut</h1>
                  </div>
                  
                  <div class="content">
                    <h2>¡Hola ${customerName}!</h2>
                    
                    <p>Esperamos que hayas disfrutado tu pedido <strong>#${shortOrderId}</strong>.</p>
                    
                    <p>Tu opinión es muy importante para nosotros. ¿Nos ayudarías con una breve reseña?</p>
                    
                    <div style="text-align: center;">
                      <a href="${reviewUrl}" class="button">
                        ⭐ Dejar Reseña
                      </a>
                    </div>
                    
                    <p style="margin-top: 30px;">
                      <strong>Tu pedido incluyó:</strong><br>
                      ${order.items.map(item => `• ${item.quantity}x ${item.productName} - S/ ${item.price.toFixed(2)}`).join('<br>')}
                    </p>
                    
                    <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      💡 <strong>Dato curioso:</strong> Las reseñas nos ayudan a mejorar y ofrecer el mejor servicio posible.
                    </p>
                  </div>
                  
                  <div class="footer">
                    <p>¿No solicitaste este email? Puedes ignorarlo de forma segura.</p>
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
    console.log('✅ Satisfaction email sent successfully');

    return {
      orderId,
      customerId,
      customerEmail,
      emailSent: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error sending satisfaction email:', error);
    throw error;
  }
};
