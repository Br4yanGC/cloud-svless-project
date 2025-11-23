import React, { useState, useEffect } from 'react';
import { LogOut, User, TrendingUp, Package, Users, DollarSign, ShoppingBag, Calendar, Eye } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor, getStatusEmoji } from '../utils/orderStatus';

const AdminRestaurantDashboard = ({ currentUser, onLogout }) => {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, orders, menu, users

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
        const ordersResponse = await apiRequest(`${API_CONFIG.ORDERS_URL}/orders`, {
          method: 'GET'
        });
        
        if (ordersResponse.orders && Array.isArray(ordersResponse.orders)) {
          setRecentOrders(ordersResponse.orders.slice(0, 10));
          
          // Calcular estadísticas basadas en las órdenes reales
          const today = new Date().toDateString();
          const todayOrders = ordersResponse.orders.filter(
            order => new Date(order.createdAt).toDateString() === today
          );
          
          const activeOrders = ordersResponse.orders.filter(
            order => ['pendiente', 'en_preparacion', 'listo', 'en_camino'].includes(order.status)
          );
          
          const completedOrders = ordersResponse.orders.filter(
            order => order.status === 'entregado'
          );
          
          const pendingOrders = ordersResponse.orders.filter(
            order => order.status === 'pendiente'
          );
          
          const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
          
          setStats({
            todayOrders: todayOrders.length,
            todayRevenue: todayRevenue,
            activeOrders: activeOrders.length,
            totalCustomers: stats.totalCustomers || 0, // Este dato vendría del servicio de auth
            pendingOrders: pendingOrders.length,
            completedOrders: completedOrders.length
          });
        }
      } catch (ordersError) {
        console.warn('Error al cargar órdenes, usando datos de ejemplo:', ordersError);
        // Mantener datos de ejemplo si falla
        setRecentOrders([
          {
            id: 'ORD-001',
            customerName: 'Juan Pérez',
            status: 'entregado',
            total: 95.80,
            createdAt: new Date().toISOString(),
            items: 3
          },
          {
            id: 'ORD-002',
            customerName: 'María García',
            status: 'en_camino',
            total: 54.80,
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
            items: 2
          },
          {
            id: 'ORD-003',
            customerName: 'Carlos López',
            status: 'en_preparacion',
            total: 128.90,
            createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
            items: 5
          }
        ]);
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
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Today's Orders */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingBag size={32} />
                  <Calendar size={24} className="opacity-70" />
                </div>
                <p className="text-blue-100 text-sm font-medium">Pedidos de Hoy</p>
                <p className="text-4xl font-bold mt-2">{stats.todayOrders}</p>
                <p className="text-blue-100 text-xs mt-2">+{stats.pendingOrders} pendientes</p>
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

              {/* Total Customers */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Users size={32} />
                  <Eye size={24} className="opacity-70" />
                </div>
                <p className="text-purple-100 text-sm font-medium">Clientes Totales</p>
                <p className="text-4xl font-bold mt-2">{stats.totalCustomers}</p>
                <p className="text-purple-100 text-xs mt-2">Clientes registrados</p>
              </div>
            </div>

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
                📦 Pedidos
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
                        {recentOrders.filter(o => o.status === 'en_preparacion').length}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">En Preparación</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-3xl font-bold text-purple-700">
                        {recentOrders.filter(o => o.status === 'listo').length}
                      </p>
                      <p className="text-sm text-purple-600 mt-1">Listos</p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                      <p className="text-3xl font-bold text-indigo-700">
                        {recentOrders.filter(o => o.status === 'en_camino').length}
                      </p>
                      <p className="text-sm text-indigo-600 mt-1">En Camino</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-3xl font-bold text-green-700">{stats.completedOrders}</p>
                      <p className="text-sm text-green-600 mt-1">Completados</p>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <ShoppingBag className="text-red-700" size={24} />
                    <span>Pedidos Recientes</span>
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
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map(order => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{order.id}</td>
                            <td className="py-3 px-4">{order.customerName || order.deliveryInfo?.customerName || 'Cliente'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(order.status)}`}>
                                {getStatusEmoji(order.status)} {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{order.items?.length || order.items || 0}</td>
                            <td className="py-3 px-4 font-semibold text-green-600">S/ {(order.total || 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{formatTime(order.createdAt)}</td>
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">Gestión de Pedidos</h2>
                <p className="text-gray-600">Funcionalidad de gestión de pedidos en desarrollo...</p>
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
    </div>
  );
};

export default AdminRestaurantDashboard;
