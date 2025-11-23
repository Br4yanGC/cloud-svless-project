import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, LogOut, User, Package, History, UtensilsCrossed, Clock, CheckCircle, Truck, X } from 'lucide-react';
import { apiRequest, API_CONFIG } from '../config';
import { getStatusLabel, getStatusColor, getStatusDescription } from '../utils/orderStatus';

const ClientHome = ({ onAddToCart, currentUser, onLogout, orderCreated, onOrderViewed, orderConfirmation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState({});
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'orders', 'history'
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // Para modal de detalles

  const categories = [
    { id: 'all', name: 'Todo', icon: '🍽️' },
    { id: 'pizzas', name: 'Pizzas', icon: '🍕' },
    { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
    { id: 'entradas', name: 'Entradas', icon: '🍗' },
    { id: 'postres', name: 'Postres', icon: '🍰' },
    { id: 'combos', name: 'Combos', icon: '🎁' }
  ];

  useEffect(() => {
    loadProducts();
    if (currentUser) {
      loadMyOrders();
    }
  }, []);

  // Cambiar a pestaña de pedidos cuando se crea un nuevo pedido
  useEffect(() => {
    if (orderCreated) {
      setActiveTab('orders');
      loadMyOrders();
    }
  }, [orderCreated]);

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'history') {
      loadMyOrders();
      
      // Conectar WebSocket para actualizaciones en tiempo real
      const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?userId=${currentUser?.id}&role=${currentUser?.role}`;
      console.log('🔌 Conectando WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Mensaje WebSocket recibido:', data);
        
        // Si es una actualización de pedido, actualizar localmente sin recargar
        if (data.type === 'ORDER_STATUS_CHANGED' || data.type === 'ORDER_ASSIGNED' || data.type === 'order-updated' || data.type === 'order-status-changed') {
          console.log('🔄 Actualizando pedido localmente...');
          
          // Si viene el order completo en data.order
          if (data.order) {
            setMyOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === data.order.id 
                  ? { ...order, ...data.order }
                  : order
              )
            );
          }
          // Si viene solo orderId y status (formato antiguo)
          else if (data.orderId) {
            setMyOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === data.orderId 
                  ? { ...order, status: data.status, timeline: data.timeline || order.timeline }
                  : order
              )
            );
          }
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
    }
  }, [activeTab]);

  const loadMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ORDERS}/my-orders`, {
        method: 'GET'
      }, 'ORDERS');
      setMyOrders(response.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setMyOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // TODO: Reemplazar con API real
      const mockProducts = [
        {
          id: '1',
          name: 'Pizza Pepperoni Grande',
          description: 'Deliciosa pizza con pepperoni y queso mozzarella',
          price: 45.90,
          category: 'pizzas',
          imageUrl: '/images/products/pizza-pepperoni.jpg',
          available: true
        },
        {
          id: '2',
          name: 'Pizza Hawaiana Mediana',
          description: 'Piña, jamón y queso mozzarella',
          price: 38.90,
          category: 'pizzas',
          imageUrl: '/images/products/pizza-hawaiana.jpg',
          available: true
        },
        {
          id: '3',
          name: 'Coca Cola 1.5L',
          description: 'Bebida refrescante',
          price: 8.50,
          category: 'bebidas',
          imageUrl: '/images/products/coca-cola.jpg',
          available: true
        },
        {
          id: '4',
          name: 'Alitas BBQ (8 unidades)',
          description: 'Alitas de pollo bañadas en salsa BBQ',
          price: 25.90,
          category: 'entradas',
          imageUrl: '/images/products/alitas.jpg',
          available: true
        },
        {
          id: '5',
          name: 'Brownie con Helado',
          description: 'Brownie de chocolate con helado de vainilla',
          price: 15.90,
          category: 'postres',
          imageUrl: '/images/products/brownie.jpg',
          available: true
        },
        {
          id: '6',
          name: 'Combo Familiar',
          description: '2 Pizzas grandes + 2 bebidas 1.5L + 1 entrada',
          price: 89.90,
          category: 'combos',
          imageUrl: '/images/products/combo-familiar.jpg',
          available: true
        }
      ];
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && product.available;
  });

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [productId]: newQty };
    });
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [productId, qty]) => {
      const product = products.find(p => p.id === productId);
      return sum + (product ? product.price * qty : 0);
    }, 0);
  };

  // Funciones de estado (label, color, emoji) vienen de utils/orderStatus.js para consistencia

  const activeOrders = myOrders.filter(order => 
    ['recibido', 'cocinando', 'empacado', 'en_camino'].includes(order.status)
  );

  const completedOrders = myOrders.filter(order => order.status === 'entregado');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold">🍕 Pizza Hut</h1>
            </div>
            
            {/* User and Cart Actions */}
            <div className="flex items-center space-x-3">
              {/* User Info */}
              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                  <User size={20} />
                  <span className="font-medium">{currentUser.name}</span>
                </div>
              )}
              
              {/* Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2"
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              )}
              
              {/* Cart Button */}
              <button 
                onClick={() => onAddToCart && onAddToCart(cart, products)}
                className="relative bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center space-x-2"
              >
                <ShoppingCart size={24} />
                <span>Carrito</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-900 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'menu'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              <UtensilsCrossed size={20} />
              <span>Menú</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'orders'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              <Package size={20} />
              <span>Mis Pedidos</span>
              {activeOrders.length > 0 && (
                <span className="bg-yellow-400 text-red-900 px-2 py-1 rounded-full text-xs font-bold">
                  {activeOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                activeTab === 'history'
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              <History size={20} />
              <span>Historial</span>
            </button>
          </div>

          {/* Search Bar - Only show on menu tab */}
          {activeTab === 'menu' && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar pizzas, bebidas, entradas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          )}
        </div>
      </header>

      {/* Categories - Only show on menu tab */}
      {activeTab === 'menu' && (
        <div className="bg-white shadow-md sticky top-[140px] z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-red-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'menu' && (
          <>
            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-200">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.category === 'combos' && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-red-900 px-3 py-1 rounded-full text-xs font-bold">
                          COMBO
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-red-600">S/ {product.price.toFixed(2)}</span>
                      </div>

                      {/* Add to Cart Controls */}
                      {cart[product.id] ? (
                        <div className="flex items-center justify-between bg-red-600 text-white rounded-lg p-2">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            <Minus size={20} />
                          </button>
                          <span className="font-bold text-lg px-4">{cart[product.id]}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Plus size={20} />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mis Pedidos Activos</h2>
              <p className="text-gray-600">Sigue el estado de tus pedidos en tiempo real</p>
            </div>

            {loadingOrders ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando pedidos...</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes pedidos activos</h3>
                <p className="text-gray-600 mb-6">Explora nuestro menú y haz tu primer pedido</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Ver Menú
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">Pedido #{order.id.slice(0, 8)}</h3>
                          
                          {/* Información de Tiempos */}
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Realizado:</span> {new Date(order.createdAt).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })} a las {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            
                            {order.deliveredAt ? (
                              <p className="text-sm text-green-700">
                                <span className="font-semibold">✓ Entregado:</span> {new Date(order.deliveredAt).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })} a las {new Date(order.deliveredAt).toLocaleTimeString('es-PE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            ) : order.statusTimestamps?.en_camino ? (
                              <p className="text-sm text-purple-700">
                                <span className="font-semibold">🚗 En camino desde:</span> {new Date(order.statusTimestamps.en_camino).toLocaleTimeString('es-PE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            ) : order.statusTimestamps?.cocinando ? (
                              <p className="text-sm text-blue-700">
                                <span className="font-semibold">👨‍🍳 En preparación desde:</span> {new Date(order.statusTimestamps.cocinando).toLocaleTimeString('es-PE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            ) : (
                              <p className="text-sm text-yellow-700">
                                <span className="font-semibold">⏳ Tiempo estimado:</span> 30-45 minutos
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${getStatusColor(order.status)}`}>
                          <span className="font-semibold">{getStatusLabel(order.status)}</span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="border-t border-gray-200 pt-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Productos:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                <span className="text-gray-600">{item.quantity}x</span>
                                <span className="text-gray-900">{item.name}</span>
                              </div>
                              <span className="font-semibold text-gray-900">S/ {item.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Info */}
                      {(order.deliveryAddress || order.customerPhone) && (
                        <div className="border-t border-gray-200 pt-4 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Información de Entrega:</h4>
                          {order.deliveryAddress && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Dirección:</span> {order.deliveryAddress}</p>
                          )}
                          {order.customerPhone && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Teléfono:</span> {order.customerPhone}</p>
                          )}
                        </div>
                      )}

                      {/* Staff Info - Mostrar quién atendió el pedido */}
                      {(order.cook || order.deliveryPerson) && (order.status === 'en_camino' || order.status === 'entregado') && (
                        <div className="border-t border-gray-200 pt-4 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Personal:</h4>
                          {order.cook && (
                            <p className="text-sm text-gray-600">👨‍🍳 <span className="font-semibold">Cocinero:</span> {order.cook.name}</p>
                          )}
                          {order.deliveryPerson && (
                            <div className="mt-1">
                              <p className="text-sm text-gray-600">🚗 <span className="font-semibold">Repartidor:</span> {order.deliveryPerson.name}</p>
                              {order.deliveryPerson.phone && (
                                <p className="text-sm text-blue-600 ml-5">📞 {order.deliveryPerson.phone}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Total */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total:</span>
                          <span className="text-2xl font-bold text-red-600">S/ {order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Historial de Pedidos</h2>
              <p className="text-gray-600">Revisa todos tus pedidos completados</p>
            </div>

            {loadingOrders ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando historial...</p>
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tienes pedidos completados</h3>
                <p className="text-gray-600">Tu historial aparecerá aquí una vez que completes tu primer pedido</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden opacity-90">
                    <div className="p-6">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">Pedido #{order.id.slice(0, 8)}</h3>
                          
                          {/* Información de Tiempos */}
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Realizado:</span> {new Date(order.createdAt).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })} a las {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            
                            <p className="text-sm text-green-700">
                              <span className="font-semibold">Entregado:</span> {order.deliveredAt ? (
                                <>
                                  {new Date(order.deliveredAt).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })} a las {new Date(order.deliveredAt).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </>
                              ) : (
                                <>
                                  {new Date(order.updatedAt || order.createdAt).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })} a las {new Date(order.updatedAt || order.createdAt).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 rounded-full border bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-semibold">Entregado</span>
                        </div>
                      </div>

                      {/* Order Items Summary */}
                      <div className="border-t border-gray-200 pt-4 mb-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-red-600 font-semibold hover:text-red-700 transition-colors flex items-center space-x-2"
                        >
                          <span>Ver detalles de {order.items.length} producto{order.items.length > 1 ? 's' : ''}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Delivery Info */}
                      {(order.deliveryAddress || order.customerPhone) && (
                        <div className="border-t border-gray-200 pt-4 mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Información de Entrega:</h4>
                          {order.deliveryAddress && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Dirección:</span> {order.deliveryAddress}</p>
                          )}
                          {order.customerPhone && (
                            <p className="text-sm text-gray-600"><span className="font-semibold">Teléfono:</span> {order.customerPhone}</p>
                          )}
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-gray-900">S/ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Summary - Only show on menu tab */}
      {activeTab === 'menu' && getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-4 border-red-600 p-4 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{getTotalItems()} producto{getTotalItems() > 1 ? 's' : ''}</p>
              <p className="text-2xl font-bold text-red-600">S/ {getTotalPrice().toFixed(2)}</p>
            </div>
            <button
              onClick={() => onAddToCart && onAddToCart(cart, products)}
              className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors shadow-lg"
            >
              Ver Carrito →
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Pedido */}
      {orderConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fadeIn">
            {/* Header */}
            <div className="bg-green-600 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={onOrderViewed}
                className="absolute top-4 right-4 text-white hover:bg-green-700 rounded-full p-1 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-3" />
                <h2 className="text-2xl font-bold">¡Pedido Confirmado!</h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">Número de pedido</p>
                <p className="text-3xl font-bold text-gray-900">#{orderConfirmation.orderNumber}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-green-600">S/ {orderConfirmation.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Tiempo estimado</span>
                  <span className="font-semibold text-gray-900">30-45 minutos</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 mb-4">
                <p>Tu pedido está siendo procesado.</p>
                <p>Recibirás una notificación cuando esté listo.</p>
              </div>

              <button
                onClick={onOrderViewed}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Detalles del Pedido</h3>
                <p className="text-sm text-gray-600">#{selectedOrder.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado y Fecha */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fecha del pedido</p>
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
                <div className={`px-4 py-2 rounded-full border-2 ${getStatusColor(selectedOrder.status)}`}>
                  <span className="font-semibold">{getStatusLabel(selectedOrder.status)}</span>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Productos:</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">S/ {item.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Subtotal: S/ {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de Entrega */}
              {(selectedOrder.deliveryAddress || selectedOrder.customerPhone) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">Información de Entrega:</h4>
                  {selectedOrder.deliveryAddress && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">Dirección:</span> {selectedOrder.deliveryAddress}
                    </p>
                  )}
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Teléfono:</span> {selectedOrder.customerPhone}
                    </p>
                  )}
                </div>
              )}

              {/* Personal Asignado */}
              {(selectedOrder.cook || selectedOrder.deliveryPerson) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-3">Personal Asignado:</h4>
                  {selectedOrder.cook && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">👨‍🍳 Cocinero:</span> {selectedOrder.cook.name}
                    </p>
                  )}
                  {selectedOrder.deliveryPerson && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">🚗 Repartidor:</span> {selectedOrder.deliveryPerson.name}
                    </p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-red-600">S/ {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón Cerrar */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
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

export default ClientHome;
