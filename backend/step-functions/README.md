# Step Functions - Review Workflow

Sistema de Step Functions para gestionar el workflow de solicitud de reseñas post-entrega.

## 🔄 Flujo del Workflow

```
Pedido Entregado (EventBridge: OrderStatusChanged → entregado)
   ↓
⏰ Espera 10 minutos
   ↓
📧 Envía email de satisfacción
   ↓
⏰ Espera 24 horas
   ↓
🔍 Verifica si dejó reseña
   ├─ ✅ SÍ → Envía email de agradecimiento + cupón 10% OFF
   └─ ❌ NO → Envía recordatorio de reseña
   ↓
✅ Workflow completo
```

## 📦 Estructura

```
step-functions/
├── serverless.yml              # Configuración de Step Functions
├── package.json
├── handlers/
│   ├── sendSatisfactionEmail.js   # Email inicial pidiendo reseña
│   ├── checkReview.js             # Verifica si existe reseña
│   ├── sendReviewReminder.js      # Recordatorio si no hay reseña
│   └── sendThankYouEmail.js       # Agradecimiento + cupón
```

## 🚀 Despliegue

### Prerrequisitos

1. Tener desplegado `orders-lambda` (para EventBridge)
2. Email verificado en AWS SES: `brayan.gomero@unmsm.edu.pe`

### Instalación

```bash
cd backend/step-functions
npm install
```

### Deploy

```bash
# Deploy en dev
serverless deploy --stage dev

# Ver logs de una función específica
serverless logs -f sendSatisfactionEmail --stage dev

# Ver estado de la Step Function
aws stepfunctions describe-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:ReviewWorkflow-dev
```

## 📊 Tabla DynamoDB: Reviews

```javascript
{
  "orderId": "4f6e8696-1234-5678-90ab-cdef12345678",  // PK
  "customerId": "user-123",
  "rating": 5,
  "comment": "Excelente servicio!",
  "createdAt": "2025-11-29T10:00:00Z"
}
```

**GSI:** `CustomerIdIndex` para buscar todas las reseñas de un cliente.

## 🎯 Eventos que Disparan el Workflow

El Step Function se inicia automáticamente cuando se recibe este evento en EventBridge:

```json
{
  "source": "restaurant.orders",
  "detail-type": "OrderStatusChanged",
  "detail": {
    "orderId": "4f6e8696-...",
    "customerId": "user-123",
    "oldStatus": "en_camino",
    "newStatus": "entregado"
  }
}
```

## 📧 Emails Enviados

### 1. Email de Satisfacción (10 min después)
- Asunto: "¿Cómo estuvo tu pedido #4f6e8696? 🍕"
- Contenido: Solicitud de reseña con botón CTA
- Link: `https://app.com/review/{orderId}`

### 2. Recordatorio (24 horas después, si no hay reseña)
- Asunto: "¡No olvides dejar tu reseña! 🌟"
- Contenido: Recordatorio + incentivo de cupón
- Promoción: 10% OFF por dejar reseña

### 3. Agradecimiento (si dejó reseña)
- Asunto: "¡Gracias por tu reseña! 🙏"
- Contenido: Agradecimiento + cupón
- Cupón: `REVIEW{shortOrderId}` - 10% OFF válido 30 días

## ⚙️ Configuración de Timeouts

- **WaitAfterDelivery:** 600 segundos (10 minutos)
- **Wait24Hours:** 86400 segundos (24 horas)
- **Retry Policy:** 2 intentos con backoff exponencial
- **Timeout por Lambda:** 30 segundos

## 🔍 Testing

### Simular evento de pedido entregado

```bash
aws events put-events --entries '[
  {
    "Source": "restaurant.orders",
    "DetailType": "OrderStatusChanged",
    "Detail": "{\"orderId\":\"test-order-123\",\"customerId\":\"user-123\",\"oldStatus\":\"en_camino\",\"newStatus\":\"entregado\"}",
    "EventBusName": "restaurant-events-dev"
  }
]'
```

### Ver ejecuciones de Step Functions

```bash
# Listar ejecuciones
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:ReviewWorkflow-dev

# Ver detalles de una ejecución
aws stepfunctions describe-execution \
  --execution-arn arn:aws:states:us-east-1:ACCOUNT:execution:ReviewWorkflow-dev:execution-id
```

## 📈 Métricas y Monitoreo

Las métricas están disponibles en CloudWatch:

- **ExecutionsStarted:** Workflows iniciados
- **ExecutionsSucceeded:** Workflows completados exitosamente
- **ExecutionsFailed:** Workflows fallidos
- **ExecutionTime:** Tiempo de ejecución

## 💰 Costos Estimados

- **Step Functions:** $0.025 por 1000 transiciones de estado
- **Lambda:** Incluido en free tier (1M requests/mes)
- **SES:** $0.10 por 1000 emails
- **DynamoDB:** PAY_PER_REQUEST (mínimo costo)

**Costo estimado por pedido:** ~$0.0002 USD

## 🛠️ Troubleshooting

### Error: Email no verificado en SES

```bash
# Verificar email en SES
aws ses verify-email-identity --email-address brayan.gomero@unmsm.edu.pe
```

### Ver logs de una ejecución fallida

```bash
serverless logs -f sendSatisfactionEmail --stage dev --startTime 1h
```

### Eliminar el servicio

```bash
serverless remove --stage dev
```

## 🔗 Integración con Frontend

Endpoint para que el cliente deje reseña:

```javascript
// POST /api/reviews
{
  "orderId": "4f6e8696-...",
  "rating": 5,
  "comment": "Excelente servicio!"
}
```

Este endpoint guardará la reseña en DynamoDB, y el Step Function lo detectará en su próxima verificación.

---

**Última actualización:** 29 de Noviembre, 2025
