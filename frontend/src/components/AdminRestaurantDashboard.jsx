import React, { useState, useEffect } from 'react';
import { LogOut, User, TrendingUp, Package, Users, DollarSign, ShoppingBag, Calendar, Eye, X, ArrowLeft, FileText, Search } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor, getStatusEmoji } from '../utils/orderStatus';
import OrderTimeline from './OrderTimeline';
import NotificationBell from './NotificationBell';

const AdminRestaurantDashboard = ({ currentUser, onLogout }) => {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    completedOrders: 0,
    confirmedRevenue: 0, // Ingresos de pedidos entregados
    potentialRevenue: 0  // Ingresos de pedidos pendientes
  });
  const [allOrders, setAllOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, orders, menu, users
  const [showHistoryView, setShowHistoryView] = useState(false); // Vista dedicada de historial
  const [selectedOrder, setSelectedOrder] = useState(null); // Para modal de detalles
  const [websocket, setWebsocket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Actualizar cada minuto
    
    // Conectar WebSocket para actualizaciones en tiempo real
    const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?userId=${currentUser?.id}&role=admin`;
    const ws = new WebSocket(wsUrl);
    setWebsocket(ws);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket conectado (Admin)');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido (Admin):', data);
      
      // Recargar dashboard cuando hay cambios
      if (data.type === 'NEW_ORDER' || data.type === 'ORDER_STATUS_CHANGED' || data.type === 'order-updated') {
        console.log('🔄 Recargando dashboard por cambio...');
        loadDashboardData();
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ Error WebSocket:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado (Admin)');
    };
    
    return () => {
      clearInterval(interval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar métricas del dashboard
      try {
        const metricsResponse = await apiRequest(`${API_CONFIG.ORDERS_URL}/dashboard/metrics`, {
          method: 'GET'
        });
        
        if (metricsResponse.stats) {
          setStats(metricsResponse.stats);
        }
      } catch (metricsError) {
        console.warn('Error al cargar métricas, usando datos de ejemplo:', metricsError);
      }
      
      // Cargar órdenes recientes
      try {
        const ordersResponse = await apiRequest(API_CONFIG.ENDPOINTS.ORDERS, {
          method: 'GET'
        }, 'ORDERS');
        
        if (ordersResponse.orders && Array.isArray(ordersResponse.orders)) {
          setAllOrders(ordersResponse.orders);
          
          // Calcular estadísticas basadas en las órdenes reales
          const today = new Date().toDateString();
          const todayOrders = ordersResponse.orders.filter(
            order => new Date(order.createdAt).toDateString() === today
          );
          
          const activeOrders = ordersResponse.orders.filter(
            order => ['recibido', 'cocinando', 'empacado', 'en_camino'].includes(order.status)
          );
          
          const completedOrders = ordersResponse.orders.filter(
            order => order.status === 'entregado'
          );
          
          const pendingOrders = ordersResponse.orders.filter(
            order => order.status === 'recibido'
          );
          
          // Ingresos confirmados (pedidos entregados)
          const confirmedRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
          
          // Ingresos potenciales (pedidos no entregados)
          const potentialRevenue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
          
          const todayRevenue = todayOrders
            .filter(o => o.status === 'entregado')
            .reduce((sum, order) => sum + (order.total || 0), 0);
          
          // Calcular productos más solicitados
          const productCount = {};
          ordersResponse.orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const key = item.name || item.productName;
                if (key) {
                  if (!productCount[key]) {
                    productCount[key] = { name: key, count: 0, revenue: 0 };
                  }
                  productCount[key].count += item.quantity || 1;
                  productCount[key].revenue += (item.price || 0) * (item.quantity || 1);
                }
              });
            }
          });
          
          const sortedProducts = Object.values(productCount)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          
          setTopProducts(sortedProducts);
          
          setStats({
            todayOrders: todayOrders.length,
            todayRevenue: todayRevenue,
            activeOrders: activeOrders.length,
            totalCustomers: stats.totalCustomers || 0,
            pendingOrders: pendingOrders.length,
            completedOrders: completedOrders.length,
            confirmedRevenue: confirmedRevenue,
            potentialRevenue: potentialRevenue
          });
        }
      } catch (ordersError) {
        console.warn('Error al cargar órdenes:', ordersError);
        setAllOrders([]);
      }
      
    } catch (error) {
      console.error('Error general al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de estado ahora vienen de utils/orderStatus.js

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conditional rendering: Full-page History View or Dashboard */}
      {showHistoryView ? (
        /* VISTA COMPLETA DE HISTORIAL */
        <>
          {/* Header para History View */}
          <header className="bg-red-700 text-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowHistoryView(false)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <FileText size={32} />
                  <div>
                    <h1 className="text-2xl font-bold">Historial Completo de Pedidos</h1>
                    <p className="text-sm text-red-100">{allOrders.length} pedidos totales</p>
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
                        <p className="text-xs text-red-100">Administrador</p>
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

          {/* Contenido del Historial Completo */}
          <div className="container mx-auto px-4 py-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando historial...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Summary cards */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-700">{allOrders.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Pedidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
                      <p className="text-sm text-gray-600 mt-1">Entregados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600">{stats.activeOrders}</p>
                      <p className="text-sm text-gray-600 mt-1">En Proceso</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-600">S/ {(stats.confirmedRevenue + stats.potentialRevenue).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-1">Ingresos Totales</p>
                    </div>
                  </div>
                </div>

                {/* Tabla de historial completo */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">ID Pedido</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Cliente</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Estado</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Items</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Total</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Cocinero</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Repartidor</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Fecha</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-mono text-sm font-semibold text-gray-900">#{order.id.slice(0, 8)}</td>
                          <td className="py-4 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600">{order.items?.length || 0}</td>
                          <td className="py-4 px-4 font-bold text-green-600">S/ {(order.total || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {order.cook ? order.cook.name : '-'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {order.deliveryPerson ? order.deliveryPerson.name : '-'}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            {new Date(order.createdAt).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center space-x-1"
                            >
                              <Eye size={16} />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allOrders.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay pedidos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VISTA DE DASHBOARD NORMAL */
        <>
      {/* Header */}
      <header className="bg-red-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <TrendingUp size={32} />
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-red-100">Dashboard Restaurant</p>
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
                    <p className="text-xs text-red-100">Administrador</p>
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
        {/* Stats Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards - Primera fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Today's Orders */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingBag size={32} />
                  <Calendar size={24} className="opacity-70" />
                </div>
                <p className="text-blue-100 text-sm font-medium">Pedidos de Hoy</p>
                <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
                <p className="text-blue-100 text-xs mt-2">{stats.pendingOrders} pendientes • {stats.completedOrders} completados</p>
              </div>

              {/* Today's Revenue */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign size={32} />
                  <TrendingUp size={24} className="opacity-70" />
                </div>
                <p className="text-green-100 text-sm font-medium">Ingresos de Hoy</p>
                <p className="text-4xl font-bold mt-2">S/ {stats.todayRevenue.toFixed(2)}</p>
                <p className="text-green-100 text-xs mt-2">Ticket promedio: S/ {stats.todayOrders > 0 ? (stats.todayRevenue / stats.todayOrders).toFixed(2) : '0.00'}</p>
              </div>

              {/* Active Orders */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Package size={32} />
                  <div className="bg-white bg-opacity-30 rounded-full px-3 py-1">
                    <span className="text-sm font-bold">{stats.activeOrders}</span>
                  </div>
                </div>
                <p className="text-orange-100 text-sm font-medium">Pedidos Activos</p>
                <p className="text-4xl font-bold mt-2">{stats.activeOrders}</p>
                <p className="text-orange-100 text-xs mt-2">En proceso de entrega</p>
              </div>

              {/* Completed Orders */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Package size={32} />
                  <div className="bg-white bg-opacity-30 rounded-full px-3 py-1">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                </div>
                <p className="text-purple-100 text-sm font-medium">Pedidos Completados</p>
                <p className="text-4xl font-bold mt-2">{stats.completedOrders}</p>
                <p className="text-purple-100 text-xs mt-2">Entregas totales</p>
              </div>
            </div>

            {/* KPI Cards - Segunda fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Confirmed Revenue */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign size={32} />
                  <div className="bg-white bg-opacity-30 rounded-full px-3 py-1">
                    <span className="text-sm font-bold">✓</span>
                  </div>
                </div>
                <p className="text-emerald-100 text-sm font-medium">Ingresos Confirmados</p>
                <p className="text-4xl font-bold mt-2">S/ {stats.confirmedRevenue.toFixed(2)}</p>
                <p className="text-emerald-100 text-xs mt-2">De {stats.completedOrders} pedidos entregados</p>
              </div>

              {/* Potential Revenue */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={32} />
                  <div className="bg-white bg-opacity-30 rounded-full px-3 py-1">
                    <span className="text-sm font-bold">⏳</span>
                  </div>
                </div>
                <p className="text-amber-100 text-sm font-medium">Ingresos Potenciales</p>
                <p className="text-4xl font-bold mt-2">S/ {stats.potentialRevenue.toFixed(2)}</p>
                <p className="text-amber-100 text-xs mt-2">De {stats.activeOrders} pedidos en proceso</p>
              </div>
            </div>

            {/* Top Products Section */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Productos Más Solicitados</h3>
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.count} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">S/ {product.revenue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Ingresos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-2 mb-6 overflow-x-auto bg-white rounded-lg p-2 shadow">
              <button
                onClick={() => setSelectedTab('overview')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  selectedTab === 'overview'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <TrendingUp size={18} />
                <span>Resumen</span>
              </button>
              <button
                onClick={() => setSelectedTab('orders')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  selectedTab === 'orders'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Package size={18} />
                <span>Pedidos Activos</span>
              </button>
              <button
                onClick={() => setSelectedTab('menu')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  selectedTab === 'menu'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ShoppingBag size={18} />
                <span>Menú</span>
              </button>
              <button
                onClick={() => setSelectedTab('users')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                  selectedTab === 'users'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users size={18} />
                <span>Usuarios</span>
              </button>
            </div>

            {/* Tab Content */}
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Orders Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <Package className="text-red-700" size={24} />
                    <span>Estado de Pedidos</span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <p className="text-3xl font-bold text-yellow-700">{stats.pendingOrders}</p>
                      <p className="text-sm text-yellow-600 mt-1">Pendientes</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-3xl font-bold text-blue-700">
                        {allOrders.filter(o => o.status === 'cocinando').length}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">En Preparación</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-3xl font-bold text-green-700">
                        {allOrders.filter(o => o.status === 'empacado').length}
                      </p>
                      <p className="text-sm text-green-600 mt-1">Listos</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-3xl font-bold text-purple-700">
                        {allOrders.filter(o => o.status === 'en_camino').length}
                      </p>
                      <p className="text-sm text-purple-600 mt-1">En Camino</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <p className="text-3xl font-bold text-gray-700">{stats.completedOrders}</p>
                      <p className="text-sm text-gray-600 mt-1">Entregados</p>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="text-red-700" size={24} />
                      <span>Últimos 10 Pedidos</span>
                    </div>
                    <button
                      onClick={() => setShowHistoryView(true)}
                      className="bg-red-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-800 transition-all flex items-center space-x-2"
                    >
                      <FileText size={18} />
                      <span>Historial Completo</span>
                    </button>
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Hora</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOrders.slice(0, 10).map(order => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">#{order.id.slice(0, 8)}</td>
                            <td className="py-3 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{order.items?.length || 0}</td>
                            <td className="py-3 px-4 font-semibold text-green-600">S/ {(order.total || 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{formatTime(order.createdAt)}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center space-x-1"
                              >
                                <Eye size={16} />
                                <span>Ver</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'orders' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="text-red-700" size={28} />
                    <span>Pedidos Activos ({allOrders.filter(o => o.status !== 'entregado').length})</span>
                  </div>
                </h2>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por ID de pedido..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">ID Pedido</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Cliente</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Cocinero</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Repartidor</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.filter(o => {
                        if (o.status === 'entregado') return false;
                        if (searchTerm) {
                          const shortId = o.id.substring(0, 8).toLowerCase();
                          const search = searchTerm.toLowerCase().replace('#', '');
                          const matchesSearch = shortId.includes(search) || o.id.toLowerCase().includes(search);
                          if (!matchesSearch) return false;
                        }
                        return true;
                      }).map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-sm font-semibold text-gray-900">#{order.id.slice(0, 8)}</td>
                          <td className="py-3 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{order.items?.length || 0}</td>
                          <td className="py-3 px-4 font-bold text-green-600">S/ {(order.total || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {order.cook ? order.cook.name : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {order.deliveryPerson ? order.deliveryPerson.name : '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {new Date(order.createdAt).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center space-x-1"
                            >
                              <Eye size={16} />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allOrders.filter(o => {
                    if (o.status === 'entregado') return false;
                    if (searchTerm) {
                      const shortId = o.id.substring(0, 8).toLowerCase();
                      const search = searchTerm.toLowerCase().replace('#', '');
                      const matchesSearch = shortId.includes(search) || o.id.toLowerCase().includes(search);
                      if (!matchesSearch) return false;
                    }
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay pedidos activos</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'menu' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Gestión de Menú</h2>
                <p className="text-gray-600">Funcionalidad de gestión de productos en desarrollo...</p>
              </div>
            )}

            {selectedTab === 'users' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Gestión de Usuarios</h2>
                <p className="text-gray-600">Funcionalidad de gestión de usuarios en desarrollo...</p>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      {/* Modal de Detalles del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pedido #{selectedOrder.id.slice(0, 8)}</h3>
                  <p className="text-red-100 text-sm">Detalles completos</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-8 space-y-6">
                {/* Estado y Fecha */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">Estado del Pedido</p>
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="border border-gray-200 p-5 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">Fecha de Creación</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedOrder.createdAt).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Timeline de Estados - Componente Separado */}
                <OrderTimeline order={selectedOrder} />

                {/* Cliente */}
                <div className="border border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-white">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <span>Información del Cliente</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Nombre</p>
                      <p className="text-gray-900 font-semibold">{selectedOrder.customerName || 'Cliente'}</p>
                    </div>
                    {selectedOrder.deliveryAddress && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Dirección de Entrega</p>
                        <p className="text-gray-900">{selectedOrder.deliveryAddress}</p>
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Teléfono</p>
                        <p className="text-gray-900 font-semibold">{selectedOrder.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Package size={20} className="text-red-600" />
                    </div>
                    <span>Productos Pedidos</span>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">{selectedOrder.items?.length || 0}</span>
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-gray-600 font-semibold">Producto</th>
                          <th className="text-center py-3 px-4 text-xs uppercase tracking-wide text-gray-600 font-semibold">Cant.</th>
                          <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-gray-600 font-semibold">Precio</th>
                          <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-gray-600 font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 font-semibold text-gray-900">{item.name}</td>
                            <td className="py-4 px-4 text-center text-gray-700 font-medium">× {item.quantity}</td>
                            <td className="py-4 px-4 text-right text-gray-700">S/ {item.price.toFixed(2)}</td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">S/ {(item.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Personal Asignado */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Users size={20} className="text-purple-600" />
                    </div>
                    <span>Personal Asignado</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Cocinero */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <User size={18} className="text-green-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Cocinero</p>
                      </div>
                      <p className="text-gray-900 font-bold text-base">
                        {selectedOrder.cook ? selectedOrder.cook.name : <span className="text-gray-400 font-normal italic">No asignado</span>}
                      </p>
                    </div>

                    {/* Despachador */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="bg-amber-100 p-2 rounded-lg">
                          <User size={18} className="text-amber-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Despachador</p>
                      </div>
                      <p className="text-gray-900 font-bold text-base">
                        {selectedOrder.dispatcher ? selectedOrder.dispatcher.name : <span className="text-gray-400 font-normal italic">No asignado</span>}
                      </p>
                    </div>

                    {/* Repartidor */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <User size={18} className="text-purple-600" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Repartidor</p>
                      </div>
                      <p className="text-gray-900 font-bold text-base">
                        {selectedOrder.deliveryPerson ? selectedOrder.deliveryPerson.name : <span className="text-gray-400 font-normal italic">No asignado</span>}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer con Total */}
            <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 font-semibold">Total del Pedido</p>
                  <p className="text-4xl font-bold text-green-600">S/ {selectedOrder.total.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2"
                >
                  <X size={18} />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurantDashboard;
