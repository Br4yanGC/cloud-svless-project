const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUser, createUser, getUserByEmail, listAdministrators, listUsersByRole, updateUser } = require('../utils/dynamodb');
const { success, error, validate } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Lambda: Register new user
module.exports.register = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, name, role, code, phoneNumber, email_notification } = body;

    // Validación básica
    if (!email || !password || !name || !role) {
      return error(400, 'Email, password, name y role son requeridos');
    }

    if (!['cliente', 'cocinero', 'despachador', 'repartidor', 'admin'].includes(role)) {
      return error(400, 'Role debe ser "cliente", "cocinero", "despachador", "repartidor" o "admin"');
    }

    if (password.length < 6) {
      return error(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    // Validar formato de teléfono si se proporciona
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      return error(400, 'El número de teléfono debe estar en formato E.164 (+51999999999)');
    }

    // Verificar si el email ya existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return error(409, 'El email ya está registrado');
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario en DynamoDB
    const user = await createUser({
      email,
      passwordHash,
      name,
      role,
      code: code || null,
      phoneNumber: phoneNumber || null,
      email_notification: email_notification || email
    });

    // Generar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({
      message: 'Usuario registrado exitosamente',
      token,
      user: userResponse
    }, 201);

  } catch (err) {
    console.error('Register error:', err);
    return error(500, 'Error al registrar usuario', err.message);
  }
};

// Lambda: Public Register (solo para estudiantes)
module.exports.registerPublic = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, name, code, phoneNumber } = body;

    // Validación básica
    if (!email || !password || !name) {
      return error(400, 'Email, password y name son requeridos');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(400, 'Formato de email inválido');
    }

    if (password.length < 6) {
      return error(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    // Validar y formatear teléfono (debe ser exactamente 9 dígitos, agregar +51)
    let formattedPhone = null;
    if (phoneNumber) {
      // Limpiar cualquier espacio o carácter no numérico
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      if (cleanPhone.length !== 9) {
        return error(400, 'El número de teléfono debe tener exactamente 9 dígitos');
      }
      
      formattedPhone = `+51${cleanPhone}`;
    }

    // Verificar si el email ya existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return error(409, 'El email ya está registrado');
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario SIEMPRE como cliente
    const user = await createUser({
      email,
      passwordHash,
      name,
      role: 'cliente', // Forzar rol cliente
      code: code || null,
      phoneNumber: formattedPhone,
      email_notification: email // Usar mismo email para notificaciones
    });

    console.log('✅ Cliente registrado:', user.email);

    // Respuesta sin password hash (NO devolver token, requiere login)
    const { passwordHash: _, ...userResponse } = user;

    return success({
      message: 'Cuenta creada exitosamente. Por favor inicia sesión.',
      user: userResponse
    }, 201);

  } catch (err) {
    console.error('Public register error:', err);
    return error(500, 'Error al registrar usuario', err.message);
  }
};

// Lambda: Login
module.exports.login = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;

    // Validación
    if (!email || !password) {
      return error(400, 'Email y password son requeridos');
    }

    // Buscar usuario por email
    const user = await getUserByEmail(email);
    if (!user) {
      return error(401, 'Credenciales inválidas');
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return error(401, 'Credenciales inválidas');
    }

    // Generar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Actualizar último login (opcional, requiere UpdateItem)
    // await updateLastLogin(user.id);

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Login error:', err);
    return error(500, 'Error al iniciar sesión', err.message);
  }
};

// Lambda: Get profile
module.exports.getProfile = async (event) => {
  try {
    // Extraer token del header Authorization
    const token = event.headers?.Authorization?.replace('Bearer ', '') ||
                  event.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return error(401, 'Token no proporcionado');
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(401, 'Token expirado');
      }
      return error(403, 'Token inválido');
    }

    // Obtener usuario de DynamoDB
    const user = await getUser(decoded.id);
    if (!user) {
      return error(404, 'Usuario no encontrado');
    }

    // Respuesta sin password hash
    const { passwordHash: _, ...userResponse } = user;

    return success({ user: userResponse });

  } catch (err) {
    console.error('Get profile error:', err);
    return error(500, 'Error al obtener perfil', err.message);
  }
};

// Lambda: Validate token (para otros microservicios)
module.exports.validateToken = async (event) => {
  try {
    // Buscar token en headers o en body
    let token = event.headers?.Authorization?.replace('Bearer ', '') ||
                event.headers?.authorization?.replace('Bearer ', '');
    
    // Si no está en headers, buscar en body
    if (!token && event.body) {
      const body = JSON.parse(event.body);
      token = body.token;
    }

    if (!token) {
      return error(401, 'Token no proporcionado');
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(401, 'Token expirado');
      }
      return error(403, 'Token inválido');
    }

    return success({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });

  } catch (err) {
    console.error('Validate token error:', err);
    return error(500, 'Error al validar token', err.message);
  }
};

// Lambda: List all administrators (for superadmin)
module.exports.listAdmins = async (event) => {
  try {
    // Verificar autenticación
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error(401, 'Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return error(403, 'Token inválido');
    }

    // Verificar que sea superadmin
    if (decoded.role !== 'superadmin') {
      return error(403, 'Solo superadmins pueden listar administradores');
    }

    // Obtener todos los administradores
    const admins = await listAdministrators();

    // Quitar información sensible
    const safeAdmins = admins.map(admin => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt
    }));

    return success({
      admins: safeAdmins,
      total: safeAdmins.length
    });

  } catch (err) {
    console.error('List admins error:', err);
    return error(500, 'Error al listar administradores', err.message);
  }
};

// Lambda: Actualizar usuario (solo superadmin puede editar admins)
module.exports.updateUserProfile = async (event) => {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    if (!token) {
      return error(401, 'No autorizado');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return error(403, 'Token inválido');
    }

    const { userId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { name, email, email_notification } = body;

    // Verificar que sea superadmin o el mismo usuario
    if (decoded.role !== 'superadmin' && decoded.id !== userId) {
      return error(403, 'No tienes permiso para editar este usuario');
    }

    // Validar que el usuario existe
    const existingUser = await getUser(userId);
    if (!existingUser) {
      return error(404, 'Usuario no encontrado');
    }

    // Preparar actualizaciones
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email_notification !== undefined) updates.email_notification = email_notification;
    
    // Si cambia el email, verificar que no esté en uso
    if (email !== undefined && email !== existingUser.email) {
      const emailExists = await getUserByEmail(email);
      if (emailExists) {
        return error(409, 'El email ya está en uso');
      }
      updates.email = email;
    }

    // Actualizar usuario
    const updatedUser = await updateUser(userId, updates);

    // Remover información sensible
    const { passwordHash, ...userResponse } = updatedUser;

    return success({
      message: 'Usuario actualizado exitosamente',
      user: userResponse
    });

  } catch (err) {
    console.error('Update user error:', err);
    return error(500, 'Error al actualizar usuario', err.message);
  }
};

// Lambda: Listar repartidores (para despachadores)
module.exports.listDrivers = async (event) => {
  try {
    // Verificar autenticación
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error(401, 'Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return error(403, 'Token inválido');
    }

    // Verificar que sea despachador, admin o superadmin
    const allowedRoles = ['despachador', 'administrador', 'superadmin'];
    if (!allowedRoles.includes(decoded.role)) {
      return error(403, 'No tienes permisos para listar repartidores');
    }

    // Obtener todos los repartidores
    const drivers = await listUsersByRole('repartidor');

    // Quitar información sensible
    const safeDrivers = drivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      createdAt: driver.createdAt
    }));

    return success({
      drivers: safeDrivers,
      total: safeDrivers.length
    });

  } catch (err) {
    console.error('List drivers error:', err);
    return error(500, 'Error al listar repartidores', err.message);
  }
};
