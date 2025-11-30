const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;

exports.handler = async (event) => {
  console.log('📧 Sending thank you email:', JSON.stringify(event, null, 2));

  try {
    const { orderId, customerId, customerEmail, reviewData } = event;

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
      console.log('⚠️ No email found, skipping thank you email');
      return {
        ...event,
        thankYouSent: false,
        reason: 'No email available'
      };
    }

    const shortOrderId = orderId.substring(0, 8);
    const rating = reviewData?.rating || 5;
    const stars = '⭐'.repeat(rating);

    const emailParams = {
      Source: 'brayan.gomero@unmsm.edu.pe',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: `¡Gracias por tu reseña! 🙏 - Pizza Hut`
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
                  .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
                  .coupon { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; border: 3px dashed #78350f; }
                  .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
                  .emoji { font-size: 48px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="emoji">🎉</div>
                    <h1 style="margin: 10px 0;">¡Gracias por tu reseña!</h1>
                  </div>
                  
                  <div class="content">
                    <h2>¡Hola ${customerName}!</h2>
                    
                    <p>Muchas gracias por tomarte el tiempo de dejarnos tu opinión sobre el pedido <strong>#${shortOrderId}</strong>.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <div style="font-size: 48px;">${stars}</div>
                      <p style="margin: 10px 0; color: #16a34a; font-size: 18px; font-weight: bold;">
                        ${rating === 5 ? '¡Excelente calificación!' : rating >= 4 ? '¡Muy buena calificación!' : '¡Gracias por tu feedback!'}
                      </p>
                    </div>
                    
                    <p>Como agradecimiento, aquí tienes un cupón especial:</p>
                    
                    <div class="coupon">
                      <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                        🎁 CUPÓN DE DESCUENTO
                      </div>
                      <div style="font-size: 48px; font-weight: bold; margin: 20px 0;">
                        10% OFF
                      </div>
                      <div style="font-size: 18px; margin-top: 10px;">
                        Código: <strong>REVIEW${shortOrderId.toUpperCase()}</strong>
                      </div>
                      <div style="font-size: 14px; margin-top: 10px; color: #78350f;">
                        Válido por 30 días
                      </div>
                    </div>
                    
                    <p style="text-align: center; color: #6b7280;">
                      Usa este código en tu próximo pedido para obtener tu descuento.
                    </p>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
                      <p style="margin: 0;">
                        <strong>💡 Sabías que...</strong><br>
                        Tus reseñas nos ayudan a mejorar continuamente nuestro servicio y productos. ¡Cada opinión cuenta!
                      </p>
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>Esperamos verte pronto de nuevo 🍕</p>
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
    console.log('✅ Thank you email sent successfully');

    return {
      ...event,
      thankYouSent: true,
      couponCode: `REVIEW${shortOrderId.toUpperCase()}`,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error sending thank you email:', error);
    throw error;
  }
};
