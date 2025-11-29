import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

const NotificationBell = ({ user, websocket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!websocket) return;

    const handleNotification = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Filtrar notificaciones según el rol del usuario
        const shouldNotify = shouldReceiveNotification(data, user);
        
        if (shouldNotify) {
          const newNotification = {
            id: Date.now(),
            type: data.type,
            message: data.message,
            orderId: data.order?.id,
            orderNumber: data.order?.orderNumber,
            timestamp: new Date().toISOString(),
            read: false
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Reproducir sonido de notificación (opcional)
          playNotificationSound();
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    websocket.addEventListener('message', handleNotification);

    return () => {
      websocket.removeEventListener('message', handleNotification);
    };
  }, [websocket, user]);

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

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_ORDER':
        return '🍕';
      case 'ORDER_STATUS_CHANGED':
        return '📦';
      case 'ORDER_DELIVERED':
        return '✅';
      default:
        return '🔔';
    }
  };

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
            {notifications.length === 0 ? (
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
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
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
