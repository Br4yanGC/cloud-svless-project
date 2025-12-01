# Sistema de Gestión de Pedidos de Restaurante

Sistema serverless para gestionar pedidos de comida inspirado en Pizza Hut.

**Integrantes:**

- Brayan Gomero Chavez
- Anthony Sleiter Aguilar Sanchez
- Jhonatan Eder Ortega Huaman
- Franco Stefano Panizo Muñoz
- Efrén Paolo Centeno Rosas
- Romina Valeria Muñoz Portugal

---

## Descripción

Sistema web para gestión de pedidos de restaurante con seguimiento en tiempo real mediante arquitectura serverless en AWS.

**Funcionalidades principales:**

- Clientes: Realizar pedidos y consultar estado
- Personal del restaurante: Gestionar workflow de preparación y entrega
- Administradores: Dashboard con métricas y asignación de tareas

**Workflow de pedidos:**

1. Recibido - Pedido confirmado
2. Cocinando - En preparación
3. Empacado - Listo para envío
4. En Camino - En ruta de entrega
5. Entregado - Completado

Adicionalmente se implementa un sistema de calificaciones post-entrega usando Step Functions.

---

## Arquitectura

**Servicios AWS:**

- Amplify - Hosting del frontend
- API Gateway - REST APIs y WebSocket
- Lambda - Lógica de negocio
- DynamoDB - Persistencia de datos
- S3 - Almacenamiento de imágenes de productos
- EventBridge - Sistema de eventos
- Step Functions - Orquestación de workflow de calificaciones
- SES - Envío de emails (configurado, requiere verificación)

**Microservicios implementados:**

1. `auth-lambda` - Autenticación JWT y gestión de usuarios
2. `orders-lambda` - CRUD de pedidos y gestión de estados
3. `menu-lambda` - Catálogo de productos con imágenes en S3
4. `websocket-lambda` - Actualizaciones en tiempo real
5. `notifications-lambda` - Envío de notificaciones por email
6. `step-functions` - Workflow automático para habilitar calificaciones

---

## Roles y Permisos

| Rol         | Acciones Permitidas                                               |
| ----------- | ----------------------------------------------------------------- |
| cliente     | Crear pedidos, ver pedidos propios, calificar pedidos entregados  |
| cocinero    | Ver pedidos asignados, cambiar estado a "cocinando"               |
| despachador | Ver pedidos asignados, cambiar estado a "empacado"                |
| repartidor  | Ver pedidos asignados, cambiar estado a "en_camino" y "entregado" |
| admin       | Gestión completa: asignar pedidos, dashboard, métricas            |

---

## Estructura del Proyecto

```
cloud-svless-project/
├── frontend/                    # React + Vite + Tailwind
│   └── src/
│       ├── components/         # Componentes de UI
│       ├── services/           # Llamadas a APIs
│       └── utils/              # Utilidades
├── backend/
│   ├── auth-lambda/            # Autenticación
│   ├── orders-lambda/          # Gestión de pedidos
│   ├── menu-lambda/            # Productos con S3
│   ├── websocket-lambda/       # Conexiones WebSocket
│   ├── notifications-lambda/   # Sistema de emails
│   └── step-functions/         # Workflow de calificaciones
```

---

## Base de Datos (DynamoDB)

**Tablas principales:**

`restaurant-orders-service-orders-dev`

- Almacena pedidos con items, estados, timeline e historial
- GSI por customerId y status para consultas eficientes

`restaurant-reviews-dev`

- Calificaciones de clientes (1-5 estrellas)
- GSI por orderId y customerId

`restaurant-menu-service-products-dev`

- Catálogo de productos con categorías
- GSI por category

`restaurant-auth-service-users-dev`

- Usuarios del sistema con roles
- GSI por email

`restaurant-websocket-service-connections-dev`

- Conexiones activas de WebSocket

---

## APIs Implementadas

**Orders API** (https://rcegr7f0k6.execute-api.us-east-1.amazonaws.com/dev)

```
POST   /orders              - Crear pedido
GET    /orders              - Listar pedidos
GET    /orders/{id}         - Obtener pedido específico
PATCH  /orders/{id}/status  - Actualizar estado
POST   /orders/{id}/assign  - Asignar a empleado
GET    /dashboard/metrics   - Métricas del dashboard
```

**Menu API** (https://5d54a4hl5k.execute-api.us-east-1.amazonaws.com/dev)

```
GET    /menu                - Listar productos
GET    /menu/{id}           - Detalle de producto
POST   /menu                - Crear producto
PUT    /menu/{id}           - Actualizar producto
POST   /menu/upload         - Subir imagen a S3
```

**Reviews API** (https://egdvyhf02e.execute-api.us-east-1.amazonaws.com/dev)

```
POST   /reviews             - Enviar calificación
GET    /reviews/{orderId}   - Obtener calificaciones
```

**Auth API** (https://tcb2i6e738.execute-api.us-east-1.amazonaws.com/dev)

```
POST   /auth/register       - Registro de usuarios
POST   /auth/login          - Autenticación
GET    /auth/me             - Perfil actual
```

**WebSocket** (wss://ipnmobquh2.execute-api.us-east-1.amazonaws.com/dev)

- Notificaciones en tiempo real de cambios de estado

---

## Sistema de Calificaciones

Implementado con Step Functions y EventBridge:

1. Admin marca pedido como "entregado"
2. EventBridge detecta evento `OrderStatusChanged` con `newStatus: entregado`
3. Step Function inicia automáticamente
4. Espera 30 segundos
5. Lambda `enableOrderReview` actualiza `order.reviewable = true`
6. WebSocket notifica al cliente
7. Frontend muestra botón "⭐ Calificar Pedido"
8. Cliente envía calificación (1-5 estrellas) con comentario opcional

Las calificaciones se almacenan en DynamoDB con soporte para quejas.

---

## Almacenamiento de Imágenes

**S3 Bucket:** `restaurant-product-images-dev`

- Almacena imágenes de productos
- Acceso público configurado
- CORS habilitado para frontend

**Productos con imágenes:**

- Pizza Pepperoni
- Pizza Hawaiana
- Coca Cola
- Alitas BBQ
- Brownie con Helado
- Combo Familiar

Scripts disponibles:

- `seed-products.js` - Poblar productos en DynamoDB
- `upload-sample-images.js` - Subir imágenes de muestra a S3

---

## Despliegue

**Requisitos:**

- Node.js 18.x
- Serverless Framework 3.x
- Credenciales AWS configuradas

**Deployment por servicio:**

```bash
# Auth Service
cd backend/auth-lambda
npm install
serverless deploy --stage dev

# Orders Service
cd backend/orders-lambda
npm install
serverless deploy --stage dev

# Menu Service
cd backend/menu-lambda
npm install
serverless deploy --stage dev
node seed-products.js  # Crear productos iniciales

# Step Functions
cd backend/step-functions
npm install
serverless deploy --stage dev

# Frontend (Amplify)
cd frontend
npm install
# Deploy via AWS Amplify Console
```

---

## Notificaciones

**Email (AWS SES):**

- Configurado para envío de confirmaciones
- Requiere verificación de dominios/emails en AWS SES
- Funcionalidad implementada pero requiere configuración adicional

**WebSocket:**

- Notificaciones en tiempo real para cambios de estado
- Broadcast a todos los usuarios conectados
- Actualización automática de UI sin recargar página

**EventBridge:**

- Sistema de eventos para integración entre microservicios
- Event bus: `restaurant-events-dev`

---

## Tecnologías

**Backend:**

- Runtime: Node.js 18.x
- Framework: Serverless Framework 3.x
- Base de datos: DynamoDB
- Autenticación: JWT
- APIs: API Gateway (REST + WebSocket)

**Frontend:**

- Framework: React 18
- Build tool: Vite
- Estilos: Tailwind CSS
- Hosting: AWS Amplify

**Infraestructura:**

- IaC: Serverless Framework (CloudFormation)
- Región: us-east-1
- IAM: LabRole (AWS Academy)

---

**Última actualización:** 30 de Noviembre, 2025
