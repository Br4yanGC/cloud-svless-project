const fetch = require('node-fetch');

const AUTH_API_URL = process.env.AUTH_API_URL;

// Verificar JWT token con el servicio de autenticación
const verifyToken = async (token) => {
  try {
    const response = await fetch(`${AUTH_API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    const data = await response.json();
    
    if (!response.ok || !data.valid) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return null;
  }
};

// Extraer token del header Authorization
const extractToken = (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Middleware para validar autenticación con roles opcionales
const requireAuth = async (event, allowedRoles = null) => {
  const token = extractToken(event);
  
  if (!token) {
    return {
      authenticated: false,
      error: 'Token de autenticación no proporcionado'
    };
  }

  const user = await verifyToken(token);
  
  if (!user) {
    return {
      authenticated: false,
      error: 'Token inválido o expirado'
    };
  }

  // Si se especifican roles permitidos, verificar
  if (allowedRoles && Array.isArray(allowedRoles)) {
    if (!allowedRoles.includes(user.role)) {
      return {
        authenticated: false,
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      };
    }
  }

  return {
    authenticated: true,
    user
  };
};

module.exports = {
  verifyToken,
  extractToken,
  requireAuth
};
