import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';

const NotificationBell = ({ user, websocket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // Obtener clave de localStorage específica para el usuario
  const getReadNotificationsKey = () => {
    return `readNotifications_${user?.id}`;
  };

  // Obtener notificaciones leídas del localStorage
  const getReadNotifications = () => {
    try {
      const stored = localStorage.getItem(getReadNotificationsKey());
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  };

  // Guardar notificación como leída en localStorage
  const markAsReadInStorage = (orderId) => {
    try {
      const readNotifications = getReadNotifications();
      readNotifications[orderId] = Date.now();
      localStorage.setItem(getReadNotificationsKey(), JSON.stringify(readNotifications));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Verificar si una orden está leída
  const isNotificationRead = (orderId) => {
    const readNotifications = getReadNotifications();
    return !!readNotifications[orderId];
  };

  // Cargar contador inicial al montar el componente
  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  // Cargar notificaciones desde DynamoDB cuando se abre el panel
  useEffect(() => {
    if (showPanel && user) {
      loadNotifications();
    }
  }, [showPanel, user]);

  // Escuchar WebSocket para actualizar cuando llegue una nueva notificación
  useEffect(() => {
    if (!websocket) return;

    const handleNotification = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Filtrar notificaciones según el rol del usuario
        const shouldNotify = shouldReceiveNotification(data, user);
        
        if (shouldNotify) {
          // Incrementar contador de no leídas
          setUnreadCount(prev => prev + 1);
          
          // Reproducir sonido de notificación
          playNotificationSound();
          
          // Si el panel está abierto, recargar las notificaciones
          if (showPanel) {
            loadNotifications();
          }
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    websocket.addEventListener('message', handleNotification);

    return () => {
      websocket.removeEventListener('message', handleNotification);
    };
  }, [websocket, user, showPanel]);

  const loadUnreadCount = async () => {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ORDERS}`, {
        method: 'GET'
      }, 'ORDERS');

      // Filtrar y convertir órdenes a notificaciones según el rol
      const orders = response.orders || [];
      const filteredNotifications = filterOrdersByRole(orders, user);
      
      // Calcular no leídas basadas en localStorage
      const unread = filteredNotifications.filter(notif => !isNotificationRead(notif.orderId)).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ORDERS}`, {
        method: 'GET'
      }, 'ORDERS');

      // Filtrar y convertir órdenes a notificaciones según el rol
      const orders = response.orders || [];
      const filteredNotifications = filterOrdersByRole(orders, user);
      
      setNotifications(filteredNotifications);
      
      // Calcular no leídas basadas en localStorage
      const unread = filteredNotifications.filter(notif => !isNotificationRead(notif.orderId)).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByRole = (orders, user) => {
    if (!user) return [];

    let relevantOrders = [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    switch (user.role) {
      case 'cocinero':
        // Todas las órdenes que pasaron por cocina (últimas 24 horas)
        relevantOrders = orders.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          // Cualquier orden que haya sido recibida o preparada
          return orderTime > twentyFourHoursAgo && 
                 (order.status === 'recibido' || 
                  order.status === 'preparando' || 
                  order.status === 'empacado' || 
                  order.status === 'en_camino' || 
                  order.status === 'entregado');
        });
        break;

      case 'despachador':
        // Todas las órdenes que llegaron a empacado (últimas 24 horas)
        relevantOrders = orders.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          // Órdenes que están o pasaron por empacado
          return orderTime > twentyFourHoursAgo && 
                 (order.status === 'empacado' || 
                  order.status === 'en_camino' || 
                  order.status === 'entregado');
        });
        break;

      case 'repartidor':
        // Todas las órdenes asignadas a este repartidor (últimas 24 horas)
        relevantOrders = orders.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          return orderTime > twentyFourHoursAgo && 
                 order.deliveryPerson?.id === user.id;
        });
        break;

      case 'cliente':
        // Todas las órdenes del cliente (últimas 24 horas)
        relevantOrders = orders.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          return orderTime > twentyFourHoursAgo && order.customerId === user.id;
        });
        break;

      case 'admin':
        // Todas las órdenes recientes (últimas 24 horas)
        relevantOrders = orders.filter(order => 
          new Date(order.createdAt).getTime() > twentyFourHoursAgo
        );
        break;

      default:
        relevantOrders = [];
    }

    // Convertir órdenes a formato de notificación
    return relevantOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(order => ({
        id: order.id,
        type: getNotificationTypeFromOrder(order, user),
        message: getNotificationMessage(order, user),
        orderId: order.id,
        orderNumber: order.orderNumber,
        timestamp: order.updatedAt || order.createdAt,
        read: isNotificationRead(order.id)
      }));
  };

  const getNotificationTypeFromOrder = (order, user) => {
    if (order.status === 'recibido' && user.role === 'cocinero') return 'NEW_ORDER';
    if (order.status === 'empacado' && user.role === 'despachador') return 'READY_TO_DISPATCH';
    if (order.status === 'en_camino' && user.role === 'repartidor') return 'ASSIGNED_DELIVERY';
    if (order.status === 'entregado') return 'ORDER_DELIVERED';
    return 'ORDER_STATUS_CHANGED';
  };

  const getNotificationMessage = (order, user) => {
    const statusMessages = {
      'recibido': 'Pedido recibido',
      'preparando': 'En preparación',
      'empacado': 'Listo para entregar',
      'en_camino': 'En camino',
      'entregado': 'Entregado'
    };

    switch (user.role) {
      case 'cocinero':
        return `Pedido #${order.orderNumber} - ${statusMessages[order.status] || order.status}`;
      case 'despachador':
        return `Pedido #${order.orderNumber} - ${statusMessages[order.status] || order.status}`;
      case 'repartidor':
        return `Pedido #${order.orderNumber} - ${statusMessages[order.status] || order.status}`;
      case 'cliente':
        return `Tu pedido #${order.orderNumber} - ${statusMessages[order.status] || order.status}`;
      case 'admin':
        return `Pedido #${order.orderNumber} - ${statusMessages[order.status] || order.status}`;
    }
    return `Pedido #${order.orderNumber}`;
  };

  const shouldReceiveNotification = (data, user) => {
    if (!data.type || !user) return false;

    const { type, order } = data;

    // Notificaciones para cocineros
    if (user.role === 'cocinero') {
      return type === 'NEW_ORDER' || 
             (type === 'ORDER_STATUS_CHANGED' && order?.status === 'recibido');
    }

    // Notificaciones para despachadores
    if (user.role === 'despachador') {
      return (type === 'ORDER_STATUS_CHANGED' && order?.status === 'empacado');
    }

    // Notificaciones para repartidores
    if (user.role === 'repartidor') {
      return (type === 'ORDER_STATUS_CHANGED' && 
              order?.status === 'en_camino' && 
              order?.deliveryPerson?.id === user.id);
    }

    // Notificaciones para clientes
    if (user.role === 'cliente') {
      return (type === 'ORDER_STATUS_CHANGED' && order?.customerId === user.id) ||
             (type === 'ORDER_DELIVERED' && order?.customerId === user.id);
    }

    // Admin recibe todas las notificaciones
    if (user.role === 'admin') {
      return true;
    }

    return false;
  };

  const playNotificationSound = () => {
    // Crear un sonido simple de notificación
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const markAsRead = (orderId) => {
    // Guardar en localStorage
    markAsReadInStorage(orderId);
    
    // Actualizar estado local
    setNotifications(prev =>
      prev.map(notif =>
        notif.orderId === orderId ? { ...notif, read: true } : notif
      )
    );
    
    // Recalcular unread count
    const newUnread = notifications.filter(n => n.orderId !== orderId && !isNotificationRead(n.orderId)).length;
    setUnreadCount(newUnread);
  };

  const markAllAsRead = () => {
    // Guardar todas en localStorage
    notifications.forEach(notif => {
      markAsReadInStorage(notif.orderId);
    });
    
    // Actualizar estado local
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_ORDER':
        return '🍕';
      case 'READY_TO_DISPATCH':
        return '📦';
      case 'ASSIGNED_DELIVERY':
        return '🚚';
      case 'ORDER_DELIVERED':
        return '✅';
      case 'ORDER_STATUS_CHANGED':
        return '🔔';
      default:
        return '🔔';
    }
  };

  // No renderizar si no hay usuario
  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {showPanel && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Notificaciones</h3>
              <p className="text-sm text-red-100">{unreadCount} sin leer</p>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="p-3 border-b border-gray-200 flex gap-2">
              <button
                onClick={markAllAsRead}
                className="flex-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Marcar todas como leídas
              </button>
              <button
                onClick={clearAll}
                className="flex-1 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Limpiar todas
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No hay notificaciones</p>
                <p className="text-sm mt-1">Estarás al tanto de los nuevos pedidos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.orderId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <p className={`text-sm ${!notification.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            {notification.orderNumber && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pedido: {notification.orderNumber}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
