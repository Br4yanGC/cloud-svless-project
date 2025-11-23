// Utilidad centralizada para estados de pedidos
// Esto asegura consistencia en todas las vistas

export const ORDER_STATUS = {
  RECIBIDO: 'recibido',
  COCINANDO: 'cocinando',
  EMPACADO: 'empacado',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado'
};

// Labels consistentes para todos los estados
export const getStatusLabel = (status) => {
  const labels = {
    [ORDER_STATUS.RECIBIDO]: 'Recibido',
    [ORDER_STATUS.COCINANDO]: 'En Preparación',
    [ORDER_STATUS.EMPACADO]: 'Listo para Envío',
    [ORDER_STATUS.EN_CAMINO]: 'En Camino',
    [ORDER_STATUS.ENTREGADO]: 'Entregado',
    [ORDER_STATUS.CANCELADO]: 'Cancelado'
  };
  return labels[status] || status;
};

// Emojis consistentes para todos los estados
export const getStatusEmoji = (status) => {
  const emojis = {
    [ORDER_STATUS.RECIBIDO]: '📋',
    [ORDER_STATUS.COCINANDO]: '🍳',
    [ORDER_STATUS.EMPACADO]: '📦',
    [ORDER_STATUS.EN_CAMINO]: '🚗',
    [ORDER_STATUS.ENTREGADO]: '✅',
    [ORDER_STATUS.CANCELADO]: '❌'
  };
  return emojis[status] || '📄';
};

// Colores consistentes para badges/pills
export const getStatusColor = (status) => {
  const colors = {
    [ORDER_STATUS.RECIBIDO]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    [ORDER_STATUS.COCINANDO]: 'bg-blue-100 text-blue-800 border-blue-300',
    [ORDER_STATUS.EMPACADO]: 'bg-green-100 text-green-800 border-green-300',
    [ORDER_STATUS.EN_CAMINO]: 'bg-purple-100 text-purple-800 border-purple-300',
    [ORDER_STATUS.ENTREGADO]: 'bg-gray-100 text-gray-800 border-gray-300',
    [ORDER_STATUS.CANCELADO]: 'bg-red-100 text-red-800 border-red-300'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};

// Descripción detallada para el cliente
export const getStatusDescription = (status) => {
  const descriptions = {
    [ORDER_STATUS.RECIBIDO]: 'Tu pedido ha sido recibido y será procesado pronto',
    [ORDER_STATUS.COCINANDO]: 'Estamos preparando tu pedido con cuidado',
    [ORDER_STATUS.EMPACADO]: 'Tu pedido está listo para envío',
    [ORDER_STATUS.EN_CAMINO]: 'Tu pedido está en camino a tu dirección',
    [ORDER_STATUS.ENTREGADO]: 'Tu pedido ha sido entregado',
    [ORDER_STATUS.CANCELADO]: 'Este pedido fue cancelado'
  };
  return descriptions[status] || '';
};
