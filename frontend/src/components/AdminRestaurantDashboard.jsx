import React, { useState, useEffect } from 'react';
import { LogOut, User, TrendingUp, Package, Users, DollarSign, ShoppingBag, Calendar, Eye, X } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor, getStatusEmoji } from '../utils/orderStatus';

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
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, orders, history, menu, users
  const [selectedOrder, setSelectedOrder] = useState(null); // Para modal de detalles

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
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
                <p className="text-emerald-100 text-sm font-medium">💰 Ingresos Confirmados</p>
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
                <p className="text-amber-100 text-sm font-medium">📊 Ingresos Potenciales</p>
                <p className="text-4xl font-bold mt-2">S/ {stats.potentialRevenue.toFixed(2)}</p>
                <p className="text-amber-100 text-xs mt-2">De {stats.activeOrders} pedidos en proceso</p>
              </div>
            </div>

            {/* Top Products Section */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🏆 Productos Más Solicitados</h3>
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

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 overflow-x-auto bg-white rounded-lg p-2 shadow">
              <button
                onClick={() => setSelectedTab('overview')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedTab === 'overview'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Resumen
              </button>
              <button
                onClick={() => setSelectedTab('orders')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedTab === 'orders'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📦 Pedidos Activos
              </button>
              <button
                onClick={() => setSelectedTab('history')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedTab === 'history'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📜 Historial Completo
              </button>
              <button
                onClick={() => setSelectedTab('menu')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedTab === 'menu'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🍕 Menú
              </button>
              <button
                onClick={() => setSelectedTab('users')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedTab === 'users'
                    ? 'bg-red-700 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                👥 Usuarios
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
                      onClick={() => setSelectedTab('orders')}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      Ver todos →
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
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(order.status)}`}>
                                {getStatusEmoji(order.status)} {getStatusLabel(order.status)}
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
                      {allOrders.filter(o => o.status !== 'entregado').map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-sm font-semibold text-gray-900">#{order.id.slice(0, 8)}</td>
                          <td className="py-3 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(order.status)}`}>
                              {getStatusEmoji(order.status)} {getStatusLabel(order.status)}
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
                  {allOrders.filter(o => o.status !== 'entregado').length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay pedidos activos</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'history' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="text-red-700" size={28} />
                    <span>Historial Completo ({allOrders.length} pedidos)</span>
                  </div>
                </h2>
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
                      {allOrders.map(order => (
                        <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-sm font-semibold text-gray-900">#{order.id.slice(0, 8)}</td>
                          <td className="py-3 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(order.status)}`}>
                              {getStatusEmoji(order.status)} {getStatusLabel(order.status)}
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
                  {allOrders.length === 0 && (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay pedidos registrados</p>
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

      {/* Modal de Detalles del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-red-700 text-white p-6 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-2xl font-bold">Detalles del Pedido</h3>
                <p className="text-red-100">#{selectedOrder.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:bg-red-800 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado y Fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusEmoji(selectedOrder.status)} {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Fecha del pedido</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Cliente */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <User size={20} className="text-blue-600" />
                  <span>Información del Cliente</span>
                </h4>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-semibold">Nombre:</span> {selectedOrder.customerName || 'Cliente'}
                  </p>
                  {selectedOrder.deliveryAddress && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Dirección:</span> {selectedOrder.deliveryAddress}
                    </p>
                  )}
                  {selectedOrder.customerPhone && (
                    <p className="text-gray-700">
                      <span className="font-semibold">Teléfono:</span> {selectedOrder.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center space-x-2">
                  <Package size={20} className="text-red-600" />
                  <span>Productos ({selectedOrder.items?.length || 0})</span>
                </h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">S/ {item.price.toFixed(2)}</p>
                        <p className="text-sm text-green-600 font-semibold">Subtotal: S/ {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Asignado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">👨‍🍳 Cocinero</h4>
                  <p className="text-gray-700">
                    {selectedOrder.cook ? selectedOrder.cook.name : 'No asignado'}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">🚗 Repartidor</h4>
                  <p className="text-gray-700">
                    {selectedOrder.deliveryPerson ? selectedOrder.deliveryPerson.name : 'No asignado'}
                  </p>
                </div>
              </div>

              {selectedOrder.dispatcher && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">👨‍💼 Despachador</h4>
                  <p className="text-gray-700">{selectedOrder.dispatcher.name}</p>
                </div>
              )}

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-green-600">S/ {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón Cerrar */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurantDashboard;
