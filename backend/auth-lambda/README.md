# Auth Service

Microservicio de autenticación y gestión de usuarios.

## Roles

- cliente
- cocinero
- despachador
- repartidor
- admin

## Endpoints

```bash
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/validate
```

## Deploy

```bash
serverless deploy --stage dev
```
