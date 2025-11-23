import React, { useState, useEffect } from 'react';
import { LogOut, User, Package, Truck, CheckCircle, Clock, MapPin, X } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor } from '../utils/orderStatus';

const DispatchDashboard = ({ currentUser, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ready'); // ready, assigned, delivered
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);

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
      if (data.type === 'NEW_ORDER' || data.type === 'ORDER_STATUS_CHANGED' || data.type === 'ORDER_ASSIGNED' || data.type === 'order-updated' || data.type === 'order-status-changed') {
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
      console.log('👤 Usuario actual (despachador):', currentUser);
      
      // Filtrar órdenes relevantes para despacho Y que este despachador haya asignado
      const dispatchOrders = response.orders.filter(order => {
        const isRelevantStatus = ['empacado', 'en_camino', 'entregado'].includes(order.status);
        const isReady = order.status === 'empacado' && !order.dispatcher; // Listos sin asignar
        const isMyDispatch = order.dispatcher && (order.dispatcher.id === currentUser?.id || order.dispatcher.email === currentUser?.email);
        
        console.log(`🔍 Orden ${order.id}:`, {
          status: order.status,
          dispatcher: order.dispatcher,
          isReady,
          isMyDispatch,
          included: isRelevantStatus && (isReady || isMyDispatch) ? '✅' : '❌'
        });
        
        return isRelevantStatus && (isReady || isMyDispatch);
      });
      
      console.log('👨‍💼 Órdenes para este despachador:', dispatchOrders);
      setOrders(dispatchOrders);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      // Obtener lista de repartidores desde el backend
      const response = await apiRequest(
        `/auth/drivers`,
        { method: 'GET' },
        'AUTH'
      );
      
      setDrivers(response.drivers || []);
    } catch (error) {
      console.error('Error cargando repartidores:', error);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const openDriverModal = (order) => {
    setSelectedOrder(order);
    setSelectedDriver(null); // Limpiar selección anterior
    setShowDriverModal(true);
    loadDrivers();
  };

  const closeDriverModal = () => {
    setShowDriverModal(false);
    setSelectedOrder(null);
    setSelectedDriver(null);
    setDrivers([]);
  };

  const confirmAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) return;
    
    setAssigningDriver(true);
    
    try {
      console.log('🚀 Asignando repartidor:', {
        orderId: selectedOrder.id,
        selectedDriver: selectedDriver,
        payload: {
          driverName: selectedDriver.name,
          driverId: selectedDriver.id,
          driverEmail: selectedDriver.email,
          driverPhone: selectedDriver.phoneNumber
        }
      });
      
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.ORDERS}/${selectedOrder.id}/assign-driver`, 
        {
          method: 'POST',
          body: JSON.stringify({ 
            driverName: selectedDriver.name,
            driverId: selectedDriver.id,
            driverEmail: selectedDriver.email,
            driverPhone: selectedDriver.phoneNumber
          })
        },
        'ORDERS'
      );
      
      console.log('✅ Repartidor asignado exitosamente:', response);
      
      // Cerrar modal
      closeDriverModal();
      
      // Actualización optimista: remover de la lista local (ya no es 'empacado')
      setOrders(orders.filter(order => order.id !== selectedOrder.id));
      
    } catch (error) {
      console.error('Error al asignar repartidor:', error);
      
      // Manejo específico de conflicto (otro despachador asignó primero)
      if (error.status === 409 || error.statusCode === 409) {
        alert('Este pedido ya fue asignado por otro despachador. Actualizando lista...');
        closeDriverModal();
        loadOrders(); // Recargar para obtener estado actualizado
      } else {
        alert(`Error al asignar repartidor: ${error.message || 'Intente nuevamente'}`);
      }
    } finally {
      setAssigningDriver(false);
    }
  };


  // Funciones getStatusColor y getStatusLabel ahora vienen de utils/orderStatus.js

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
                  <p className="text-gray-700"><strong>📞 Cliente:</strong> {order.customerPhone || 'N/A'}</p>
                  <p className="text-gray-700"><strong>💰 Total:</strong> S/ {(order.total || 0).toFixed(2)}</p>
                  
                  {/* Información del Cocinero */}
                  {order.cook && (
                    <p className="text-purple-700"><strong>👨‍🍳 Cocinero:</strong> {order.cook.name}</p>
                  )}
                  
                  {/* Información del Repartidor (cuando está asignado) */}
                  {order.deliveryPerson && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="font-semibold text-blue-800 mb-1">🚗 Repartidor Asignado:</p>
                      <p className="text-blue-700"><strong>Nombre:</strong> {order.deliveryPerson.name}</p>
                      {order.deliveryPerson.phone && (
                        <p className="text-blue-700"><strong>Teléfono:</strong> {order.deliveryPerson.phone}</p>
                      )}
                      {order.deliveryPerson.email && (
                        <p className="text-blue-700 text-sm">{order.deliveryPerson.email}</p>
                      )}
                      {order.dispatcher && (
                        <p className="text-gray-600 text-sm mt-2">
                          <em>Asignado por: {order.dispatcher.name}</em>
                        </p>
                      )}
                    </div>
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
                    onClick={() => openDriverModal(order)}
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

      {/* Modal de Selección de Repartidor */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Asignar Repartidor</h3>
                <p className="text-sm text-blue-100">
                  Pedido #{selectedOrder?.id.substring(0, 8)}
                </p>
              </div>
              <button
                onClick={closeDriverModal}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loadingDrivers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Cargando repartidores...</p>
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600 font-semibold">No hay repartidores disponibles</p>
                  <p className="text-gray-500 text-sm mt-2">Contacte al administrador para registrar repartidores</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <p className="text-gray-700 font-semibold mb-4">
                    Selecciona un repartidor:
                  </p>
                  {drivers.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className={`w-full border-2 rounded-xl p-4 transition-all text-left ${
                        selectedDriver?.id === driver.id
                          ? 'bg-blue-100 border-blue-500 shadow-lg'
                          : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`rounded-full p-3 transition-colors ${
                          selectedDriver?.id === driver.id
                            ? 'bg-blue-200'
                            : 'bg-blue-100'
                        }`}>
                          <Truck className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold transition-colors ${
                            selectedDriver?.id === driver.id
                              ? 'text-blue-700'
                              : 'text-gray-800'
                          }`}>
                            {driver.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {driver.email}
                          </p>
                          {driver.phoneNumber && (
                            <p className="text-sm text-gray-600">
                              📞 {driver.phoneNumber}
                            </p>
                          )}
                        </div>
                        {selectedDriver?.id === driver.id && (
                          <div className="text-blue-600">
                            <CheckCircle size={24} />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <button
                onClick={closeDriverModal}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              
              <button
                onClick={confirmAssignDriver}
                disabled={!selectedDriver || assigningDriver}
                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                  selectedDriver && !assigningDriver
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {assigningDriver ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Asignando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>Confirmar Asignación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchDashboard;
