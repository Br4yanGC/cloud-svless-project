import React, { useState, useEffect } from 'react';
import { LogOut, User, MapPin, Phone, Navigation, CheckCircle, Package, Search } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor } from '../utils/orderStatus';
import NotificationBell from './NotificationBell';

const DeliveryDashboard = ({ currentUser, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [websocket, setWebsocket] = useState(null);
  const [filter, setFilter] = useState('assigned');
  const [searchTerm, setSearchTerm] = useState(''); // assigned, delivered

  useEffect(() => {
    loadMyOrders();
    
    // Conectar WebSocket para actualizaciones en tiempo real
    const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?userId=${currentUser?.id}&role=repartidor`;
    const ws = new WebSocket(wsUrl);
    setWebsocket(ws);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket conectado (Repartidor)');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido (Repartidor):', data);
      
      // Recargar órdenes cuando hay cambios
      if (data.type === 'ORDER_ASSIGNED' || data.type === 'ORDER_STATUS_CHANGED' || data.type === 'order-status-changed') {
        console.log('🔄 Recargando órdenes por cambio...');
        loadMyOrders();
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const loadMyOrders = async () => {
    try {
      setLoading(true);
      // Obtener todas las órdenes y filtrar las que tienen al repartidor actual asignado
      const response = await apiRequest(API_CONFIG.ENDPOINTS.ORDERS, {
        method: 'GET'
      }, 'ORDERS');
      
      console.log('📦 Todas las órdenes:', response.orders);
      console.log('👤 Current User:', currentUser);
      console.log('👤 Current User ID:', currentUser?.id);
      console.log('👤 Current User Email:', currentUser?.email);
      
      // Filtrar órdenes asignadas a este repartidor
      const myDeliveries = response.orders.filter(order => {
        if (!order.deliveryPerson) {
          console.log(`❌ Orden ${order.id}: No tiene deliveryPerson asignado`);
          return false;
        }
        
        const matchById = order.deliveryPerson.id === currentUser?.id;
        const matchByEmail = order.deliveryPerson.email === currentUser?.email;
        const match = matchById || matchByEmail;
        
        console.log(`🔍 Orden ${order.id}:`, {
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryPerson: order.deliveryPerson,
          currentUserId: currentUser?.id,
          currentUserEmail: currentUser?.email,
          matchById,
          matchByEmail,
          MATCH: match ? '✅' : '❌'
        });
        
        return match;
      });
      
      console.log('🚗 Mis entregas filtradas:', myDeliveries);
      console.log(`📊 Total de entregas encontradas: ${myDeliveries.length}`);
      setOrders(myDeliveries);
    } catch (error) {
      console.error('Error al cargar mis órdenes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      await apiRequest(
        `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/status`, 
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'entregado' })
        },
        'ORDERS'
      );
      
      console.log('✅ Pedido marcado como entregado');
      
      // Actualización optimista
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'entregado' } : order
      ));
      
    } catch (error) {
      console.error('Error al marcar como entregado:', error);
      alert('Error al actualizar el estado del pedido');
    }
  };

  const openInMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const shortId = order.id.substring(0, 8).toLowerCase();
      const search = searchTerm.toLowerCase().replace('#', '');
      const matchesSearch = shortId.includes(search) || order.id.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (filter === 'assigned') return order.status === 'en_camino' || order.status === 'empacado';
    if (filter === 'delivered') return order.status === 'entregado';
    return true;
  });

  const assignedCount = orders.filter(o => o.status === 'en_camino' || o.status === 'empacado').length;
  const deliveredCount = orders.filter(o => o.status === 'entregado').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Package size={32} />
              <div>
                <h1 className="text-2xl font-bold">Panel de Reparto</h1>
                <p className="text-sm text-green-100">Mis Entregas</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <NotificationBell user={currentUser} websocket={websocket} />
              
              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <User size={20} />
                  <div>
                    <p className="font-medium text-sm">{currentUser.name}</p>
                    <p className="text-xs text-green-100">Repartidor</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={onLogout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">Entregas Pendientes</p>
                <p className="text-3xl font-bold text-blue-800">{assignedCount}</p>
              </div>
              <Navigation className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold">Entregas Completadas</p>
                <p className="text-3xl font-bold text-green-800">{deliveredCount}</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por ID de pedido (#4f6e8696)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('assigned')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'assigned'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pendientes ({assignedCount})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              filter === 'delivered'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Completadas ({deliveredCount})
          </button>
        </div>

        {/* Orders */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando entregas...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No tienes entregas asignadas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map(order => (
              <div key={order.id} className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
                order.status === 'en_camino' ? 'border-blue-300' : 'border-gray-300'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Pedido #{order.id.substring(0, 8)}</h3>
                    <p className="text-lg text-gray-600 font-semibold">{order.customerName || 'Cliente'}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Realizado:</span> {new Date(order.createdAt).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short'
                        })} a las {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {order.deliveredAt && (
                        <p className="text-sm text-green-700">
                          <span className="font-semibold">✓ Entregado:</span> {new Date(order.deliveredAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short'
                          })} a las {new Date(order.deliveredAt).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-700">Dirección de Entrega</p>
                      <p className="text-gray-600">{order.deliveryAddress || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="text-green-600" size={20} />
                    <div>
                      <p className="font-semibold text-gray-700">Teléfono Cliente</p>
                      <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline font-semibold">
                        {order.customerPhone || 'N/A'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-semibold text-gray-700">Monto a Cobrar</p>
                      <p className="text-xl font-bold text-green-600">S/ {(order.total || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="font-semibold text-gray-700 mb-3">📦 Productos:</h4>
                  <ul className="space-y-2">
                    {(order.items || []).map((item, index) => (
                      <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-600">
                          S/ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => openInMaps(order.deliveryAddress)}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Navigation size={20} />
                    <span>Abrir en Maps</span>
                  </button>

                  {order.status === 'empacado' && (
                    <button
                      onClick={async () => {
                        try {
                          await apiRequest(
                            `${API_CONFIG.ENDPOINTS.ORDERS}/${order.id}/status`,
                            {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'en_camino' })
                            },
                            'ORDERS'
                          );
                          // Actualización optimista
                          setOrders(orders.map(o => 
                            o.id === order.id ? { ...o, status: 'en_camino' } : o
                          ));
                        } catch (error) {
                          console.error('Error al iniciar reparto:', error);
                          alert('Error al actualizar el estado del pedido');
                        }
                      }}
                      className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Package size={20} />
                      <span>Comenzar Reparto</span>
                    </button>
                  )}

                  {order.status === 'en_camino' && (
                    <button
                      onClick={() => markAsDelivered(order.id)}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle size={20} />
                      <span>Marcar Entregado</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
