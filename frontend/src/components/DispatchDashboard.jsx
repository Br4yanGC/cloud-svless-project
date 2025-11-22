import React, { useState, useEffect } from 'react';
import { LogOut, User, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';

const DispatchDashboard = ({ currentUser, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ready'); // ready, assigned, delivered

  useEffect(() => {
    loadOrders();
    
    // Conectar WebSocket para actualizaciones en tiempo real
    const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?userId=${currentUser?.id}&role=despachador`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket conectado (Despacho)');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido (Despacho):', data);
      
      // Recargar órdenes cuando hay cambios
      if (data.type === 'NEW_ORDER' || data.type === 'order-updated' || data.type === 'order-status-changed' || data.type === 'ORDER_STATUS_CHANGED') {
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
      
      console.log('📦 Órdenes recibidas (Despacho):', response.orders);
      
      // Filtrar órdenes relevantes para despacho (empacado, en_camino, entregado)
      const dispatchOrders = response.orders.filter(order => 
        ['empacado', 'en_camino', 'entregado'].includes(order.status)
      );
      
      console.log('👨‍💼 Órdenes para despacho:', dispatchOrders);
      setOrders(dispatchOrders);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const assignToDriver = async (orderId, driverName) => {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/assign-driver`, 
        {
          method: 'POST',
          body: JSON.stringify({ driverName })
        },
        'ORDERS'
      );
      
      console.log('✅ Repartidor asignado exitosamente');
      
      // Actualización optimista: remover de la lista local (ya no es 'empacado')
      setOrders(orders.filter(order => order.id !== orderId));
      
    } catch (error) {
      console.error('Error al asignar repartidor:', error);
      
      // Manejo específico de conflicto (otro despachador asignó primero)
      if (error.status === 409 || error.statusCode === 409) {
        alert('Este pedido ya fue asignado por otro despachador. Actualizando lista...');
        loadOrders(); // Recargar para obtener estado actualizado
      } else {
        alert(`Error al asignar repartidor: ${error.message || 'Intente nuevamente'}`);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'empacado': 'bg-green-100 text-green-800 border-green-300',
      'en_camino': 'bg-blue-100 text-blue-800 border-blue-300',
      'entregado': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'empacado': 'Listo para Envío',
      'en_camino': 'En Camino',
      'entregado': 'Entregado'
    };
    return labels[status] || status;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'ready') return order.status === 'empacado';
    if (filter === 'assigned') return order.status === 'en_camino';
    if (filter === 'delivered') return order.status === 'entregado';
    return true;
  });

  const readyCount = orders.filter(o => o.status === 'empacado').length;
  const assignedCount = orders.filter(o => o.status === 'en_camino').length;
  const deliveredCount = orders.filter(o => o.status === 'entregado').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Package size={32} />
              <div>
                <h1 className="text-2xl font-bold">Panel de Despacho</h1>
                <p className="text-sm text-purple-100">Gestión de Entregas</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <User size={20} />
                  <div>
                    <p className="font-medium text-sm">{currentUser.name}</p>
                    <p className="text-xs text-purple-100">Despachador</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold">Listos para Envío</p>
                <p className="text-3xl font-bold text-green-800">{readyCount}</p>
              </div>
              <Clock className="text-green-600" size={40} />
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">En Camino</p>
                <p className="text-3xl font-bold text-blue-800">{assignedCount}</p>
              </div>
              <Truck className="text-blue-600" size={40} />
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Entregados</p>
                <p className="text-3xl font-bold text-gray-800">{deliveredCount}</p>
              </div>
              <CheckCircle className="text-gray-600" size={40} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('ready')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'ready'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Listos ({readyCount})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'assigned'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            En Camino ({assignedCount})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === 'delivered'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Entregados ({deliveredCount})
          </button>
        </div>

        {/* Orders */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando órdenes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Pedido #{order.id.substring(0, 8)}</h3>
                    <p className="text-gray-600 font-semibold">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-gray-700"><strong>📍 Dirección:</strong> {order.deliveryAddress || 'N/A'}</p>
                  <p className="text-gray-700"><strong>📞 Teléfono:</strong> {order.customerPhone || 'N/A'}</p>
                  <p className="text-gray-700"><strong>💰 Total:</strong> S/ {(order.total || 0).toFixed(2)}</p>
                  {order.deliveryDriver && (
                    <p className="text-blue-700"><strong>🚗 Repartidor:</strong> {order.deliveryDriver}</p>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 mb-3">
                  <h4 className="font-semibold text-gray-700 mb-2">Productos:</h4>
                  <ul className="space-y-1">
                    {(order.items || []).map((item, index) => (
                      <li key={index} className="text-gray-600">
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.status === 'empacado' && (
                  <button
                    onClick={() => {
                      const driver = prompt('Nombre del repartidor:');
                      if (driver) assignToDriver(order.id, driver);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Asignar Repartidor
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchDashboard;
