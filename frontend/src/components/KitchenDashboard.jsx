import React, { useState, useEffect } from 'react';
import { LogOut, User, Clock, CheckCircle, ChefHat, Package } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor } from '../utils/orderStatus';

const KitchenDashboard = ({ currentUser, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, in-progress, completed

  useEffect(() => {
    loadOrders();
    
    // Conectar WebSocket para actualizaciones en tiempo real
    const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?userId=${currentUser?.id}&role=cocinero`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket conectado (Cocina)');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido (Cocina):', data);
      
      // Recargar órdenes cuando hay cambios
      if (data.type === 'NEW_ORDER' || data.type === 'ORDER_STATUS_CHANGED' || data.type === 'ORDER_ASSIGNED' || data.type === 'order-created' || data.type === 'order-updated' || data.type === 'order-status-changed') {
        console.log('🔄 Recargando órdenes por cambio...');
        loadOrders();
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

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_CONFIG.ENDPOINTS.ORDERS, {
        method: 'GET'
      }, 'ORDERS');
      
      console.log('📦 Órdenes recibidas del backend:', response.orders);
      console.log('📦 Total órdenes:', response.orders?.length || 0);
      console.log('👤 Usuario actual (cocinero):', currentUser);
      
      // Log de IDs de órdenes para debug
      response.orders?.forEach(order => {
        console.log(`📋 Orden: ${order.orderNumber} - ID: ${order.id} - Estado: ${order.status} - Cook:`, order.cook);
      });
      
      // Filtrar solo órdenes relevantes para cocina Y que este cocinero haya tomado
      const kitchenOrders = response.orders.filter(order => {
        // Incluir órdenes con estado recibido (pendientes de asignar) O que este cocinero haya tomado
        const isRelevantStatus = ['recibido', 'cocinando', 'empacado', 'en_camino', 'entregado'].includes(order.status);
        const isPending = order.status === 'recibido'; // Pendientes sin asignar
        const isMyCook = order.cook && (order.cook.id === currentUser?.id || order.cook.email === currentUser?.email);
        
        return isRelevantStatus && (isPending || isMyCook);
      });
      
      console.log('👨‍🍳 Órdenes para este cocinero:', kitchenOrders);
      console.log('👨‍🍳 Estados encontrados:', [...new Set(response.orders.map(o => o.status))]);
      
      setOrders(kitchenOrders);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log('🔄 Actualizando orden:', orderId, 'a estado:', newStatus);
      const url = `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/status`;
      console.log('📍 URL completa:', url);
      console.log('📦 Payload:', { status: newStatus });
      
      // Actualizar optimistamente en la UI (antes de la respuesta del servidor)
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      const response = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      }, 'ORDERS');
      
      console.log('✅ Estado actualizado exitosamente:', response);
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Error mensaje:', error.message);
      console.error('❌ Error response:', error.response);
      alert(`Error al actualizar el estado de la orden: ${error.message || 'Error interno del servidor'}`);
      // Revertir el cambio optimista si falla
      loadOrders();
    }
  };

  // Funciones getStatusColor y getStatusLabel ahora vienen de utils/orderStatus.js

  const getTimeElapsed = (createdAt) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt)) / 60000);
    if (minutes < 1) return 'Hace menos de 1 min';
    if (minutes === 1) return 'Hace 1 minuto';
    return `Hace ${minutes} minutos`;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.status === 'recibido';
    if (filter === 'in-progress') return order.status === 'cocinando';
    if (filter === 'completed') return order.status === 'empacado' || order.status === 'en_camino' || order.status === 'entregado';
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'recibido').length;
  const inProgressCount = orders.filter(o => o.status === 'cocinando').length;
  const readyCount = orders.filter(o => o.status === 'empacado' || o.status === 'en_camino' || o.status === 'entregado').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ChefHat size={32} />
              <div>
                <h1 className="text-2xl font-bold">Panel de Cocina</h1>
                <p className="text-sm text-orange-100">Gestión de Pedidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* User Info */}
              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <User size={20} />
                  <div>
                    <p className="font-medium text-sm">{currentUser.name}</p>
                    <p className="text-xs text-orange-100">Cocinero</p>
                  </div>
                </div>
              )}
              
              {/* Logout Button */}
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

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-semibold">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-800">{pendingCount}</p>
              </div>
              <Clock className="text-yellow-600" size={40} />
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">En Preparación</p>
                <p className="text-3xl font-bold text-blue-800">{inProgressCount}</p>
              </div>
              <ChefHat className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold">Listos</p>
                <p className="text-3xl font-bold text-green-800">{readyCount}</p>
              </div>
              <CheckCircle className="text-green-600" size={40} />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'in-progress'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            En Preparación ({inProgressCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'completed'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Listos ({readyCount})
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando órdenes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No hay órdenes en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 hover:shadow-xl transition-shadow">
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">Pedido #{order.id.substring(0, 8)}</h3>
                    <p className="text-gray-600">{order.customerName}</p>
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
                    {/* Mostrar quién está cocinando solo si es otro cocinero */}
                    {order.cook && order.cook.id !== currentUser?.id && (
                      <p className="text-sm text-gray-500 mt-1">
                        👨‍🍳 Cocinero: {order.cook.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Order Items */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Productos:</h4>
                  <ul className="space-y-2">
                    {(order.items || []).map((item, index) => (
                      <li key={index} className="flex justify-between text-gray-700">
                        <span className="font-medium">
                          {item.quantity}x {item.name || item.productName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  {order.status === 'recibido' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cocinando')}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Comenzar Preparación
                    </button>
                  )}
                  
                  {order.status === 'cocinando' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'empacado')}
                      className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Marcar como Listo
                    </button>
                  )}

                  {order.status === 'empacado' && (
                    <div className="flex-1 bg-green-50 border-2 border-green-300 px-4 py-3 rounded-lg text-center">
                      <p className="text-green-700 font-semibold">✓ Esperando Despacho</p>
                    </div>
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

export default KitchenDashboard;
