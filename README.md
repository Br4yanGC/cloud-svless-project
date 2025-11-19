# 🍕 Sistema de Gestión de Pedidos de Restaurante

Sistema serverless para gestionar pedidos de comida de restaurante. Inspirado en Pizza Hut.

**Integrantes:**
- Brayan Gomero
- Diego Rivadeneyra
- Domenic Rincon
- Eliseo Velasquez

---

## 📋 Descripción

Sistema serverless para gestionar pedidos de un restaurante con seguimiento en tiempo real.

**Referencia:** [Pizza Hut Perú](https://www.pizzahut.com.pe/)

### Requerimientos del Negocio

**Aplicación Web de Clientes:**
- Clientes pueden realizar pedidos de comida
- Ver estado de atención de su pedido en tiempo real

**Aplicación Web del Restaurante:**

Workflow de Pedidos:
1. **Recibido** - Pedido confirmado en el sistema
2. **Cocinando** - Cocinero prepara la comida
3. **Empacado** - Despachador empaca el pedido
4. **En Camino** - Repartidor entrega el pedido
5. **Entregado** - Cliente recibe la comida

Dashboard del restaurante:
- Ver estado de cada pedido
- Tiempos de inicio y fin de cada paso
- Identificar quién atendió cada paso
- Métricas y resumen del día

---

## 🏗️ Arquitectura

**Servicios AWS utilizados:**
- AWS Amplify (Frontend)
- API Gateway (REST + WebSocket)
- Lambda (Microservicios)
- DynamoDB (Base de datos)
- EventBridge (Eventos)
- Step Functions (Workflow)
- SES (Emails)
- S3 (Imágenes)

**Microservicios:**
1. **auth-lambda** - Autenticación y usuarios
2. **orders-lambda** - Gestión de pedidos ⭐ NUEVO
3. **menu-lambda** - Catálogo de productos ⭐ NUEVO
4. **notifications-lambda** - Envío de emails
5. **websocket-lambda** - Actualizaciones en tiempo real

---

## 🔐 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| **cliente** | Crear pedidos, ver sus pedidos, tracking |
| **cocinero** | Ver pedidos asignados, actualizar a "cocinando" |
| **despachador** | Ver pedidos asignados, actualizar a "empacado" |
| **repartidor** | Ver pedidos asignados, actualizar a "en_camino" y "entregado" |
| **admin** | Todas las operaciones, asignar pedidos, ver dashboard |

---

## 📦 Estados de Pedidos

```
RECIBIDO → COCINANDO → EMPACADO → EN_CAMINO → ENTREGADO
   ↓           ↓           ↓
         CANCELADO
```

---

## 📁 Estructura del Proyecto

```
cloud-svless-project/
├── README.md
├── frontend/                    # React + Vite + TailwindCSS
│   └── src/
│       └── components/
├── backend/
│   ├── auth-lambda/            # Autenticación
│   ├── orders-lambda/          # ⭐ Gestión de pedidos
│   ├── menu-lambda/            # ⭐ Catálogo de productos
│   ├── notifications-lambda/   # Emails
│   └── websocket-lambda/       # Tiempo real
```

---

## 🚀 Despliegue

### Orders Service
```bash
cd backend/orders-lambda
npm install
serverless deploy --stage dev
```

### Menu Service
```bash
cd backend/menu-lambda
npm install
serverless deploy --stage dev
```

---

## 📡 API Endpoints

### Orders API
```
POST   /api/orders              - Crear pedido (cliente)
GET    /api/orders              - Listar pedidos
GET    /api/orders/{id}         - Obtener pedido
PATCH  /api/orders/{id}/status  - Actualizar estado (staff)
POST   /api/orders/{id}/assign  - Asignar a empleado (admin)
GET    /api/dashboard/metrics   - Métricas (admin)
```

### Menu API
```
GET    /api/menu                - Listar productos
GET    /api/menu/{id}           - Detalle de producto
POST   /api/menu                - Crear producto (admin)
PUT    /api/menu/{id}           - Actualizar producto (admin)
```

---

## 📊 Base de Datos (DynamoDB)

### Tabla: Orders
```javascript
{
  id, orderNumber, customerId, customerName,
  items[], subtotal, delivery, total,
  status, timeline[], cook, packer, deliveryPerson,
  history[], createdAt, updatedAt
}
```

**Índices:**
- Primary: `id`
- GSI: `customerId-createdAt` (pedidos de un cliente)
- GSI: `status-createdAt` (filtrar por estado)

### Tabla: Products
```javascript
{
  id, name, description, category,
  sizes[], customizations[],
  imageUrl, isAvailable
}
```

**Categorías:** pizzas, bebidas, entradas, postres, combos

---

## 🍕 Productos de Ejemplo

El menú incluye 20 productos:

**Pizzas:** Super Supreme, Hawaiana, Pepperoni, Americana, 4 Quesos, Vegetariana

**Bebidas:** Coca Cola, Inca Kola, Sprite, Agua

**Entradas:** Alitas Picantes, Pan al ajo, Tequeños, Chicken Poppers

**Postres:** Brownie, Cheesecake, Helado

**Combos:** Familiar, Personal, Fiesta

Ver `backend/menu-lambda/seedData.js` para más detalles.

---

## 🔔 Notificaciones

**Email (AWS SES):**
- Confirmación de pedido
- Actualización de estado
- Asignación a empleados

**WebSocket:**
- Nuevo pedido → Staff del restaurante
- Cambio de estado → Cliente
- Tracking en tiempo real

---

## 📝 Modelo de Pedido

```javascript
{
  "orderNumber": "ORD-2025-00123",
  "items": [
    {
      "name": "Pizza Hawaiana",
      "size": "Familiar",
      "quantity": 2,
      "price": 35.90
    }
  ],
  "total": 76.80,
  "status": "cocinando",
  "timeline": [
    {
      "status": "recibido",
      "timestamp": "2025-11-18T10:00:00Z",
      "duration": "2 min"
    },
    {
      "status": "cocinando",
      "assignedToName": "Juan Pérez",
      "timestamp": "2025-11-18T10:02:00Z"
    }
  ]
}
```

---

## 🛠️ Tecnologías

**Backend:**
- Node.js 18.x
- Serverless Framework
- AWS Lambda
- DynamoDB
- API Gateway

**Frontend:**
- React + Vite
- TailwindCSS

---

## 📄 Licencia

MIT

---

**Última actualización:** 18 de Noviembre, 2025
