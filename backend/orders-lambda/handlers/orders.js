const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../utils/auth');
const { success, error } = require('../utils/response');
const { notifyOrderUpdate, notifyRestaurantStaff } = require('../utils/websocket');
const { sendOrderNotification } = require('../utils/notifications');
const {
  createOrder,
  getOrderById,
  listAllOrders,
  listOrdersByCustomer,
  listOrdersByAssignee,
  listOrdersByStatus,
  updateOrder,
  deleteOrder
} = require('../utils/dynamodb');

// Estados válidos de pedidos
const ORDER_STATES = {
  RECIBIDO: 'recibido',
  COCINANDO: 'cocinando',
  EMPACADO: 'empacado',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado'
};

// Transiciones válidas de estado
const VALID_TRANSITIONS = {
  recibido: ['cocinando', 'cancelado'],
  cocinando: ['empacado', 'cancelado'],
  empacado: ['en_camino', 'cancelado'],
  en_camino: ['entregado'],
  entregado: [],
  cancelado: []
};

// Lambda: Crear pedido
module.exports.create = async (event) => {
  try {
    // Verificar autenticación (cliente)
    const auth = await requireAuth(event, ['cliente']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const body = JSON.parse(event.body);
    const { items, deliveryAddress, customerPhone, notes } = body;

    // Validación
    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(400, 'Debe incluir al menos un producto en el pedido');
    }

    if (!deliveryAddress) {
      return error(400, 'La dirección de entrega es requerida');
    }

    if (!customerPhone) {
      return error(400, 'El teléfono de contacto es requerido');
    }

    // Calcular totales
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const delivery = 5.00; // Costo fijo de delivery
    const total = subtotal + delivery;

    // Generar ID y número de pedido
    const id = uuidv4();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    const now = new Date().toISOString();
    
    const order = {
      id,
      orderNumber,
      
      // Cliente
      customerId: auth.user.id,
      customerName: auth.user.name,
      customerEmail: auth.user.email,
      customerPhone,
      deliveryAddress,
      
      // Items
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        size: item.size || 'Mediana',
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations || []
      })),
      
      // Costos
      subtotal: parseFloat(subtotal.toFixed(2)),
      delivery,
      total: parseFloat(total.toFixed(2)),
      
      // Estado y Workflow
      status: ORDER_STATES.RECIBIDO,
      
      // Timeline de seguimiento
      timeline: [
        {
          status: ORDER_STATES.RECIBIDO,
          timestamp: now,
          duration: null
        }
      ],
      
      // Asignaciones (inicialmente null)
      cook: null,
      packer: null,
      deliveryPerson: null,
      
      // Notas adicionales
      notes: notes || '',
      
      // Historial
      history: [
        {
          action: 'Pedido creado',
          timestamp: now,
          user: `Cliente: ${auth.user.name}`,
          details: `Pedido ${orderNumber} - Total: S/ ${total.toFixed(2)}`
        }
      ],
      
      createdAt: now,
      updatedAt: now
    };

    await createOrder(order);

    // Notificar al restaurante via WebSocket
    await notifyRestaurantStaff({
      type: 'NEW_ORDER',
      order,
      message: `Nuevo pedido recibido: ${order.orderNumber} - S/ ${order.total.toFixed(2)}`
    });

    // Enviar email de confirmación al cliente
    try {
      await sendOrderNotification({
        type: 'ORDER_CREATED',
        email: auth.user.email,
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items
      });
    } catch (emailError) {
      console.error('Error enviando email de confirmación:', emailError);
      // No fallar si el email falla
    }

    return success({
      message: 'Pedido creado exitosamente',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        estimatedTime: '30-40 minutos'
      }
    });

  } catch (err) {
    console.error('Error creando pedido:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Listar pedidos
module.exports.list = async (event) => {
  try {
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { status, customerId, assignedTo, limit = 50 } = event.queryStringParameters || {};

    let orders;

    // Clientes solo pueden ver sus propios pedidos
    if (auth.user.role === 'cliente') {
      orders = await listOrdersByCustomer(auth.user.id, limit);
    }
    // Staff puede ver según filtros
    else if (status) {
      orders = await listOrdersByStatus(status, limit);
    } else if (customerId) {
      orders = await listOrdersByCustomer(customerId, limit);
    } else if (assignedTo) {
      orders = await listOrdersByAssignee(assignedTo, limit);
    } else {
      orders = await listAllOrders(limit);
    }

    return success({
      orders: orders || [],
      count: orders ? orders.length : 0
    });

  } catch (err) {
    console.error('Error listando pedidos:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Obtener pedido por ID
module.exports.getById = async (event) => {
  try {
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;

    const order = await getOrderById(id);
    
    if (!order) {
      return error(404, 'Pedido no encontrado');
    }

    // Clientes solo pueden ver sus propios pedidos
    if (auth.user.role === 'cliente' && order.customerId !== auth.user.id) {
      return error(403, 'No tiene permiso para ver este pedido');
    }

    return success({ order });

  } catch (err) {
    console.error('Error obteniendo pedido:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Actualizar estado del pedido
module.exports.updateStatus = async (event) => {
  try {
    // Solo staff puede actualizar estados
    const auth = await requireAuth(event, ['admin', 'cocinero', 'despachador', 'repartidor']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const { status: newStatus, notes } = JSON.parse(event.body);

    // Validar estado
    if (!Object.values(ORDER_STATES).includes(newStatus)) {
      return error(400, `Estado inválido. Debe ser uno de: ${Object.values(ORDER_STATES).join(', ')}`);
    }

    const order = await getOrderById(id);
    
    if (!order) {
      return error(404, 'Pedido no encontrado');
    }

    const currentStatus = order.status;

    // Validar transición de estado
    if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
      return error(400, `No se puede cambiar de "${currentStatus}" a "${newStatus}"`);
    }

    const now = new Date().toISOString();
    
    // Actualizar el timeline
    const lastTimelineEntry = order.timeline[order.timeline.length - 1];
    if (lastTimelineEntry && !lastTimelineEntry.endTime) {
      const startTime = new Date(lastTimelineEntry.timestamp);
      const endTime = new Date(now);
      const durationMs = endTime - startTime;
      const durationMinutes = Math.round(durationMs / 60000);
      
      lastTimelineEntry.endTime = now;
      lastTimelineEntry.duration = `${durationMinutes} min`;
    }

    // Agregar nueva entrada al timeline
    const newTimelineEntry = {
      status: newStatus,
      timestamp: now,
      assignedTo: auth.user.id,
      assignedToName: auth.user.name,
      endTime: null,
      duration: null
    };

    order.timeline.push(newTimelineEntry);

    // Actualizar asignaciones según el rol
    if (newStatus === ORDER_STATES.COCINANDO && auth.user.role === 'cocinero') {
      order.cook = { id: auth.user.id, name: auth.user.name };
    } else if (newStatus === ORDER_STATES.EMPACADO && auth.user.role === 'despachador') {
      order.packer = { id: auth.user.id, name: auth.user.name };
    } else if (newStatus === ORDER_STATES.EN_CAMINO && auth.user.role === 'repartidor') {
      order.deliveryPerson = { id: auth.user.id, name: auth.user.name };
    }

    // Agregar al historial
    order.history.push({
      action: `Estado cambiado a "${newStatus}"`,
      timestamp: now,
      user: auth.user.name,
      details: notes || ''
    });

    order.status = newStatus;
    order.updatedAt = now;

    await updateOrder(id, order);

    // Notificar al cliente via WebSocket
    await notifyOrderUpdate({
      orderId: id,
      customerId: order.customerId,
      type: 'ORDER_STATUS_CHANGED',
      status: newStatus,
      timeline: order.timeline,
      message: `Tu pedido ${order.orderNumber} está ahora: ${newStatus}`
    });

    // Enviar email al cliente
    try {
      await sendOrderNotification({
        type: 'ORDER_STATUS_UPDATE',
        email: order.customerEmail,
        orderNumber: order.orderNumber,
        status: newStatus
      });
    } catch (emailError) {
      console.error('Error enviando email de actualización:', emailError);
    }

    return success({
      message: 'Estado del pedido actualizado',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        timeline: order.timeline
      }
    });

  } catch (err) {
    console.error('Error actualizando estado del pedido:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Asignar pedido a empleado
module.exports.assign = async (event) => {
  try {
    // Solo admin puede asignar pedidos
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const { employeeId, employeeName, role } = JSON.parse(event.body);

    if (!employeeId || !employeeName || !role) {
      return error(400, 'Se requiere employeeId, employeeName y role');
    }

    const validRoles = ['cocinero', 'despachador', 'repartidor'];
    if (!validRoles.includes(role)) {
      return error(400, `Rol debe ser uno de: ${validRoles.join(', ')}`);
    }

    const order = await getOrderById(id);
    
    if (!order) {
      return error(404, 'Pedido no encontrado');
    }

    const now = new Date().toISOString();
    const employeeInfo = { id: employeeId, name: employeeName };

    // Asignar según rol
    if (role === 'cocinero') {
      order.cook = employeeInfo;
    } else if (role === 'despachador') {
      order.packer = employeeInfo;
    } else if (role === 'repartidor') {
      order.deliveryPerson = employeeInfo;
    }

    order.history.push({
      action: `Pedido asignado a ${role}`,
      timestamp: now,
      user: auth.user.name,
      details: `${role}: ${employeeName}`
    });

    order.updatedAt = now;

    await updateOrder(id, order);

    // Notificar al restaurante
    await notifyRestaurantStaff({
      type: 'ORDER_ASSIGNED',
      order,
      role,
      employee: employeeInfo
    });

    return success({
      message: 'Pedido asignado exitosamente',
      order
    });

  } catch (err) {
    console.error('Error asignando pedido:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Obtener pedidos asignados a mí
module.exports.myAssignments = async (event) => {
  try {
    const auth = await requireAuth(event, ['cocinero', 'despachador', 'repartidor']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const orders = await listOrdersByAssignee(auth.user.id);

    return success({
      orders: orders || [],
      count: orders ? orders.length : 0
    });

  } catch (err) {
    console.error('Error obteniendo asignaciones:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Cancelar pedido
module.exports.cancel = async (event) => {
  try {
    const auth = await requireAuth(event);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const { id } = event.pathParameters;
    const { reason } = JSON.parse(event.body || '{}');

    const order = await getOrderById(id);
    
    if (!order) {
      return error(404, 'Pedido no encontrado');
    }

    // Clientes solo pueden cancelar sus propios pedidos y solo si están en "recibido"
    if (auth.user.role === 'cliente') {
      if (order.customerId !== auth.user.id) {
        return error(403, 'No tiene permiso para cancelar este pedido');
      }
      if (order.status !== ORDER_STATES.RECIBIDO) {
        return error(400, 'Solo se pueden cancelar pedidos en estado "recibido"');
      }
    }

    const now = new Date().toISOString();

    order.status = ORDER_STATES.CANCELADO;
    order.history.push({
      action: 'Pedido cancelado',
      timestamp: now,
      user: auth.user.name,
      details: reason || 'Sin razón especificada'
    });
    order.updatedAt = now;

    await updateOrder(id, order);

    // Notificar
    await notifyOrderUpdate({
      orderId: id,
      customerId: order.customerId,
      type: 'ORDER_CANCELLED',
      message: `Pedido ${order.orderNumber} cancelado`
    });

    return success({
      message: 'Pedido cancelado exitosamente',
      order
    });

  } catch (err) {
    console.error('Error cancelando pedido:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Obtener pedidos del cliente actual
module.exports.myOrders = async (event) => {
  try {
    // Verificar autenticación (cliente)
    const auth = await requireAuth(event, ['cliente']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    // Obtener pedidos del cliente
    const orders = await listOrdersByCustomer(auth.user.id);

    // Ordenar por fecha más reciente primero
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return success({ 
      orders,
      count: orders.length 
    });

  } catch (err) {
    console.error('Error obteniendo pedidos del cliente:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Lambda: Obtener métricas del dashboard
module.exports.dashboardMetrics = async (event) => {
  try {
    const auth = await requireAuth(event, ['admin']);
    if (!auth.authenticated) {
      return error(401, auth.error);
    }

    const allOrders = await listAllOrders(1000);

    // Calcular métricas
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = allOrders.filter(o => o.createdAt.startsWith(today));

    const metrics = {
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
      
      activeOrders: allOrders.filter(o => 
        ![ORDER_STATES.ENTREGADO, ORDER_STATES.CANCELADO].includes(o.status)
      ).length,
      
      ordersByStatus: {
        recibido: allOrders.filter(o => o.status === ORDER_STATES.RECIBIDO).length,
        cocinando: allOrders.filter(o => o.status === ORDER_STATES.COCINANDO).length,
        empacado: allOrders.filter(o => o.status === ORDER_STATES.EMPACADO).length,
        en_camino: allOrders.filter(o => o.status === ORDER_STATES.EN_CAMINO).length,
        entregado: allOrders.filter(o => o.status === ORDER_STATES.ENTREGADO).length,
        cancelado: allOrders.filter(o => o.status === ORDER_STATES.CANCELADO).length
      },
      
      // Calcular tiempo promedio de entrega
      averageDeliveryTime: calculateAverageDeliveryTime(
        allOrders.filter(o => o.status === ORDER_STATES.ENTREGADO)
      )
    };

    return success({ metrics });

  } catch (err) {
    console.error('Error obteniendo métricas:', err);
    return error(500, 'Error interno del servidor');
  }
};

// Función auxiliar para calcular tiempo promedio
function calculateAverageDeliveryTime(deliveredOrders) {
  if (deliveredOrders.length === 0) return 0;

  const totalMinutes = deliveredOrders.reduce((sum, order) => {
    const created = new Date(order.createdAt);
    const lastEntry = order.timeline[order.timeline.length - 1];
    const completed = new Date(lastEntry.timestamp);
    const diffMs = completed - created;
    const diffMinutes = diffMs / 60000;
    return sum + diffMinutes;
  }, 0);

  return Math.round(totalMinutes / deliveredOrders.length);
}
