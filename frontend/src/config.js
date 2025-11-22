// Configuración de API
export const API_CONFIG = {
  AUTH_URL: 'https://tcb2i6e738.execute-api.us-east-1.amazonaws.com/dev',
  ORDERS_URL: import.meta.env.VITE_ORDERS_API_URL || 'https://rcegr7f0k6.execute-api.us-east-1.amazonaws.com/dev',
  MENU_URL: import.meta.env.VITE_MENU_API_URL || 'https://5d54a4hl5k.execute-api.us-east-1.amazonaws.com/dev',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'wss://localhost:3003', // Pendiente de deploy
  ENDPOINTS: {
    // Auth
    REGISTER: '/auth/register',
    REGISTER_PUBLIC: '/auth/register/public',
    LOGIN: '/auth/login',
    PROFILE: '/auth/me',
    VALIDATE: '/auth/validate',
    // Orders
    ORDERS: '/orders',
    CREATE_ORDER: '/orders',
    ORDER_BY_ID: (id) => `/orders/${id}`,
    UPDATE_ORDER_STATUS: (id) => `/orders/${id}/status`,
    ASSIGN_ORDER: (id) => `/orders/${id}/assign`,
    MY_ASSIGNMENTS: '/orders/my-assignments',
    CANCEL_ORDER: (id) => `/orders/${id}/cancel`,
    DASHBOARD_METRICS: '/dashboard/metrics',
    // Menu
    MENU: '/menu',
    PRODUCT_BY_ID: (id) => `/menu/${id}`,
  }
};

// Helper para hacer requests con autenticación
export const apiRequest = async (endpoint, options = {}, apiType = 'AUTH') => {
  const token = localStorage.getItem('token');
  const skipAuth = options.skipAuth || false;
  
  // Seleccionar la URL base según el tipo de API
  let baseUrl;
  switch (apiType) {
    case 'ORDERS':
      baseUrl = API_CONFIG.ORDERS_URL;
      break;
    case 'MENU':
      baseUrl = API_CONFIG.MENU_URL;
      break;
    case 'AUTH':
    default:
      baseUrl = API_CONFIG.AUTH_URL;
  }
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !skipAuth && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  // Remove skipAuth from options before fetch
  delete config.skipAuth;

  const response = await fetch(`${baseUrl}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
};
