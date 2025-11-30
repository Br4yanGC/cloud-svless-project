# Step Functions - Review Enablement Workflow

Sistema de AWS Step Functions que habilita automáticamente la opción de calificar pedidos después de la entrega.

## 🔄 Flujo del Workflow

```
1. Pedido se marca como "ENTREGADO"
   ↓
2. EventBridge detecta evento "OrderStatusChanged → entregado"
   ↓
3. Step Function se inicia automáticamente
   ↓
4. ⏰ Espera 5 minutos (para que el cliente reciba el pedido)
   ↓
5. Lambda "enableOrderReview" actualiza DynamoDB:
   - reviewable: true
   - reviewEnabledAt: timestamp
   - reviewSubmitted: false
   ↓
6. Publica evento "ReviewEnabled" en EventBridge
   ↓
7. ✅ Cliente puede ver botón "Calificar Pedido" en su historial
```

## 📦 Estructura

```
step-functions/
├── serverless.yml              # Configuración de Step Functions
├── package.json
├── handlers/
│   ├── enableOrderReview.js    # Habilita calificación (Step Function)
│   ├── submitReview.js         # API: Guardar reseña del cliente
│   └── getOrderReviews.js      # API: Obtener reseñas de un pedido
```

## 🚀 Despliegue

### Instalación

```bash
cd backend/step-functions
npm install
```

### Deploy

```bash
serverless deploy --stage dev
```

Esto creará:
- ✅ State Machine: `EnableReviewWorkflow-dev`
- ✅ DynamoDB Table: `restaurant-reviews-dev`
- ✅ 3 Lambda Functions
- ✅ API Gateway endpoints para reviews
- ✅ EventBridge Rule (auto-trigger)

## 📊 Tabla DynamoDB: Reviews

```javascript
{
  "id": "review-uuid",               // PK
  "orderId": "4f6e8696-...",         // GSI
  "customerId": "user-123",          // GSI + Sort Key
  "rating": 5,                       // 1-5 estrellas
  "comment": "Excelente pizza!",
  "hasComplaint": false,
  "complaintText": null,
  "createdAt": "2025-11-29T...",
  "updatedAt": "2025-11-29T..."
}
```

**Índices:**
- `OrderIdIndex` - Buscar reseñas por pedido
- `CustomerIdIndex` - Buscar reseñas de un cliente (con sort por fecha)

## 🔗 API Endpoints

Después del deploy, obtendrás una URL de API Gateway:

### POST /reviews
Crear nueva reseña

```json
{
  "orderId": "4f6e8696-...",
  "customerId": "user-123",
  "rating": 5,
  "comment": "Excelente servicio!",
  "hasComplaint": false,
  "complaintText": null
}
```

### GET /reviews/{orderId}
Obtener reseñas de un pedido

**Response:**
```json
{
  "reviews": [...],
  "count": 1
}
```

## 🎯 Integración con EventBridge

El Step Function se dispara automáticamente con este patrón de evento:

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

## 🎨 Integración Frontend

### 1. Actualizar config.js con URL del API

Después del deploy, copia el API Gateway URL:

```javascript
// frontend/src/config.js
REVIEWS_URL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev'
```

### 2. El componente ya está integrado

- ✅ `ReviewModal.jsx` - Modal de calificación
- ✅ `ClientHome.jsx` - Muestra botón "Calificar Pedido"
- ✅ Detecta `order.reviewable && !order.reviewSubmitted`

## ⚙️ Configuración

### Timeouts

- **Wait After Delivery:** 300 segundos (5 minutos)
- **Lambda Timeout:** 30 segundos
- **Retry Policy:** 3 intentos con backoff exponencial

### Variables de Entorno

```yaml
ORDERS_TABLE: restaurant-orders-dev
REVIEWS_TABLE: restaurant-reviews-dev
STAGE: dev
```

## 🔍 Testing

### 1. Simular evento de pedido entregado

```bash
aws events put-events --entries '[
  {
    "Source": "restaurant.orders",
    "DetailType": "OrderStatusChanged",
    "Detail": "{\"orderId\":\"test-123\",\"customerId\":\"user-123\",\"oldStatus\":\"en_camino\",\"newStatus\":\"entregado\"}",
    "EventBusName": "restaurant-events-dev"
  }
]'
```

### 2. Verificar ejecución del Step Function

```bash
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:ACCOUNT:stateMachine:EnableReviewWorkflow-dev
```

### 3. Ver logs de Lambda

```bash
serverless logs -f enableOrderReview --stage dev --tail
```

## 📈 Monitoreo

### CloudWatch Metrics

- `ExecutionsStarted` - Workflows iniciados
- `ExecutionsSucceeded` - Workflows exitosos
- `ExecutionsFailed` - Workflows fallidos
- `ExecutionTime` - Tiempo de ejecución

### Ver estado en AWS Console

1. AWS Step Functions Console
2. State Machines → `EnableReviewWorkflow-dev`
3. Executions → Ver historial de ejecuciones

## 🎨 Frontend - Flujo de Usuario

```
1. Cliente ve "Mis Pedidos" → Tab "Historial"
   ↓
2. Pedido entregado muestra:
   - ✅ Badge "Entregado"
   - ⭐ Botón "Calificar Pedido" (si reviewable=true)
   ↓
3. Click en "Calificar Pedido"
   ↓
4. Modal aparece con:
   - ⭐⭐⭐⭐⭐ Estrellas clickeables
   - 📝 Textarea para comentario
   - ❌ Checkbox "Tengo un reclamo"
   - 📋 Textarea de reclamo (si checkbox marcado)
   ↓
5. Submit → POST /reviews
   ↓
6. Orden se marca como reviewSubmitted=true
   ↓
7. Aparece: ✅ "Ya calificaste este pedido"
```

## 💰 Costos

- **Step Functions:** $0.025 por 1000 transiciones
- **Lambda:** Free tier (1M requests/mes)
- **DynamoDB:** PAY_PER_REQUEST (~$1.25 por millón de lecturas)
- **API Gateway:** $3.50 por millón de requests

**Costo estimado por pedido:** ~$0.0001 USD

## 🛠️ Troubleshooting

### Error: State machine not triggering

Verificar EventBridge rule:
```bash
aws events list-rules --name-prefix EnableReviewWorkflow
```

### Error: Review not showing in frontend

1. Verificar que el pedido tiene `reviewable: true` en DynamoDB
2. Check logs: `serverless logs -f enableOrderReview`
3. Verificar que han pasado 5 minutos desde la entrega

### Eliminar el servicio

```bash
serverless remove --stage dev
```

---

**Última actualización:** 29 de Noviembre, 2025
