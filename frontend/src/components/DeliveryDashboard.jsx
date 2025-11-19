import React, { useState, useEffect } from 'react';
import { LogOut, User, MapPin, Phone, Navigation, CheckCircle, Package } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';

const DeliveryDashboard = ({ currentUser, onLogout }) => {
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('assigned'); // assigned, delivered

  useEffect(() => {
    loadMyOrders();
    const interval = setInterval(loadMyOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMyOrders = async () => {
    try {
      setLoading(true);
      // Obtener solo las órdenes asignadas a este repartidor
      const response = await apiRequest(`${API_CONFIG.ORDERS_URL}/orders/my-assignments`, {
        method: 'GET'
      });
      
      setMyOrders(response.orders || []);
    } catch (error) {
      console.error('Error al cargar mis órdenes:', error);
      // Mock data si falla la API
      setMyOrders([
        {
          id: 'ORD-001',
          customerName: 'Juan Pérez',
          deliveryInfo: {
            customerName: 'Juan Pérez',
            address: 'Av. Los Pinos 123, San Isidro',
            phone: '+51999888777',
            reference: 'Edificio azul, Depto 302'
          },
          address: 'Av. Los Pinos 123, San Isidro',
          phone: '+51999888777',
          reference: 'Edificio azul, Depto 302',
          items: [
            { productName: 'Pizza Pepperoni Grande', quantity: 2 },
            { productName: 'Coca Cola 1.5L', quantity: 1 }
          ],
          status: 'en_camino',
          total: 95.80,
          assignedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      await apiRequest(`${API_CONFIG.ORDERS_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'entregado' })
      });
      
      setMyOrders(myOrders.map(order => 
        order.id === orderId ? { ...order, status: 'entregado' } : order
      ));
      
      alert('¡Pedido marcado como entregado exitosamente!');
    } catch (error) {
      console.error('Error al marcar como entregado:', error);
      alert('Error al actualizar el estado del pedido');
    }
  };

  const openInMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const filteredOrders = myOrders.filter(order => {
    if (filter === 'assigned') return order.status === 'en_camino';
    if (filter === 'delivered') return order.status === 'entregado';
    return true;
  });

  const assignedCount = myOrders.filter(o => o.status === 'en_camino').length;
  const deliveredCount = myOrders.filter(o => o.status === 'entregado').length;

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
                    <h3 className="text-2xl font-bold text-gray-800">#{order.id}</h3>
                    <p className="text-lg text-gray-600 font-semibold">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    order.status === 'en_camino' 
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                      : 'bg-green-100 text-green-800 border-2 border-green-300'
                  }`}>
                    {order.status === 'en_camino' ? '🚗 En Camino' : '✓ Entregado'}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-700">Dirección de Entrega</p>
                      <p className="text-gray-600">{order.address || order.deliveryInfo?.address || 'N/A'}</p>
                      {(order.reference || order.deliveryInfo?.reference) && (
                        <p className="text-sm text-gray-500 italic mt-1">Ref: {order.reference || order.deliveryInfo?.reference}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="text-green-600" size={20} />
                    <div>
                      <p className="font-semibold text-gray-700">Teléfono</p>
                      <a href={`tel:${order.phone || order.deliveryInfo?.phone}`} className="text-blue-600 hover:underline">
                        {order.phone || order.deliveryInfo?.phone || 'N/A'}
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
                          {item.quantity}x {item.productName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => openInMaps(order.address || order.deliveryInfo?.address)}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Navigation size={20} />
                    <span>Abrir en Maps</span>
                  </button>

                  {order.status === 'en_camino' && (
                    <button
                      onClick={() => {
                        if (window.confirm('¿Confirmas que el pedido fue entregado?')) {
                          markAsDelivered(order.id);
                        }
                      }}
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
