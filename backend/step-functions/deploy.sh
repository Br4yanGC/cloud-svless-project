#!/bin/bash

# Deploy Step Functions Service
# Este script despliega el servicio de Step Functions para el workflow de reseñas

echo "🚀 Deploying Step Functions Review Workflow..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "serverless.yml" ]; then
    echo "❌ Error: serverless.yml no encontrado"
    echo "   Ejecuta este script desde: backend/step-functions/"
    exit 1
fi

# Verificar que las dependencias estén instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Deploy
echo "📤 Desplegando en AWS..."
serverless deploy --stage dev --verbose

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Step Functions desplegado exitosamente!"
    echo ""
    echo "📊 Recursos creados:"
    echo "   - State Machine: ReviewWorkflow-dev"
    echo "   - DynamoDB Table: restaurant-reviews-dev"
    echo "   - 4 Lambda Functions:"
    echo "     • sendSatisfactionEmail"
    echo "     • checkReview"
    echo "     • sendReviewReminder"
    echo "     • sendThankYouEmail"
    echo ""
    echo "🔗 EventBridge Integration:"
    echo "   Se ejecuta automáticamente cuando un pedido cambia a estado 'entregado'"
    echo ""
    echo "📧 Verificar email en SES:"
    echo "   aws ses verify-email-identity --email-address brayan.gomero@unmsm.edu.pe"
    echo ""
else
    echo ""
    echo "❌ Error en el deployment"
    exit 1
fi
