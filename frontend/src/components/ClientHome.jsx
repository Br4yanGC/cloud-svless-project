import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, LogOut, User } from 'lucide-react';

const ClientHome = ({ onAddToCart, currentUser, onLogout }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState({});

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
  }, []);

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
          imageUrl: 'https://via.placeholder.com/300x200/e74c3c/fff?text=Pepperoni',
          available: true
        },
        {
          id: '2',
          name: 'Pizza Hawaiana Mediana',
          description: 'Piña, jamón y queso mozzarella',
          price: 38.90,
          category: 'pizzas',
          imageUrl: 'https://via.placeholder.com/300x200/f39c12/fff?text=Hawaiana',
          available: true
        },
        {
          id: '3',
          name: 'Coca Cola 1.5L',
          description: 'Bebida refrescante',
          price: 8.50,
          category: 'bebidas',
          imageUrl: 'https://via.placeholder.com/300x200/c0392b/fff?text=Coca+Cola',
          available: true
        },
        {
          id: '4',
          name: 'Alitas BBQ (8 unidades)',
          description: 'Alitas de pollo bañadas en salsa BBQ',
          price: 25.90,
          category: 'entradas',
          imageUrl: 'https://via.placeholder.com/300x200/d35400/fff?text=Alitas',
          available: true
        },
        {
          id: '5',
          name: 'Brownie con Helado',
          description: 'Brownie de chocolate con helado de vainilla',
          price: 15.90,
          category: 'postres',
          imageUrl: 'https://via.placeholder.com/300x200/8e44ad/fff?text=Brownie',
          available: true
        },
        {
          id: '6',
          name: 'Combo Familiar',
          description: '2 Pizzas grandes + 2 bebidas 1.5L + 1 entrada',
          price: 89.90,
          category: 'combos',
          imageUrl: 'https://via.placeholder.com/300x200/27ae60/fff?text=Combo',
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

          {/* Search Bar */}
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
        </div>
      </header>

      {/* Categories */}
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

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
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
      </div>

      {/* Floating Cart Summary */}
      {getTotalItems() > 0 && (
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
    </div>
  );
};

export default ClientHome;
