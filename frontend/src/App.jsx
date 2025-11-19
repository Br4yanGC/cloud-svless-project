import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ClientHome from './components/ClientHome';
import Cart from './components/Cart';
import KitchenDashboard from './components/KitchenDashboard';
import DispatchDashboard from './components/DispatchDashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
import AdminRestaurantDashboard from './components/AdminRestaurantDashboard';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [cart, setCart] = React.useState({});
  const [products, setProducts] = React.useState([]);
  const [showCart, setShowCart] = React.useState(false);

  // Verificar si hay sesión guardada al cargar la app
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setIsAuthenticated(true);
        setCurrentUser(userData);
        console.log('✅ Sesión restaurada desde localStorage:', userData);
      } catch (error) {
        console.error('❌ Error al restaurar sesión:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setCurrentUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Usuario guardado en localStorage:', userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCart({});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Sesión cerrada, localStorage limpiado');
  };

  const handleAddToCart = (cartData, productsData) => {
    setCart(cartData);
    setProducts(productsData);
    setShowCart(true);
  };

  const handleBackToMenu = () => {
    setShowCart(false);
  };

  const handleCheckout = async (orderData) => {
    console.log('Procesando pedido:', orderData);
    // TODO: Implementar API call para crear orden
    alert('Pedido realizado con éxito! (pendiente de implementar API)');
    setCart({});
    setShowCart(false);
  };

  return (
    <Router>
      <Routes>
        {/* Login - Primera vista */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />
          } 
        />
        
        {/* Registro */}
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/home" /> : <Register onRegister={handleLogin} />
          } 
        />

        {/* Home - Catálogo de productos (protegido) */}
        <Route 
          path="/home" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" />
            ) : currentUser?.role === 'admin' ? (
              <Navigate to="/admin" />
            ) : currentUser?.role === 'cocinero' ? (
              <Navigate to="/kitchen" />
            ) : currentUser?.role === 'despachador' ? (
              <Navigate to="/dispatch" />
            ) : currentUser?.role === 'repartidor' ? (
              <Navigate to="/delivery" />
            ) : showCart ? (
              <Cart 
                cart={cart}
                products={products}
                onBack={handleBackToMenu}
                onCheckout={handleCheckout}
                onLogout={handleLogout}
              />
            ) : (
              <ClientHome 
                onAddToCart={handleAddToCart}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          } 
        />

        {/* Kitchen Dashboard - Solo para cocineros */}
        <Route 
          path="/kitchen" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" />
            ) : currentUser?.role !== 'cocinero' ? (
              <Navigate to="/home" />
            ) : (
              <KitchenDashboard 
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          } 
        />

        {/* Dispatch Dashboard - Solo para despachadores */}
        <Route 
          path="/dispatch" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" />
            ) : currentUser?.role !== 'despachador' ? (
              <Navigate to="/home" />
            ) : (
              <DispatchDashboard 
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          } 
        />

        {/* Delivery Dashboard - Solo para repartidores */}
        <Route 
          path="/delivery" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" />
            ) : currentUser?.role !== 'repartidor' ? (
              <Navigate to="/home" />
            ) : (
              <DeliveryDashboard 
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          } 
        />

        {/* Admin Dashboard - Solo para administradores */}
        <Route 
          path="/admin" 
          element={
            !isAuthenticated ? (
              <Navigate to="/login" />
            ) : currentUser?.role !== 'admin' ? (
              <Navigate to="/home" />
            ) : (
              <AdminRestaurantDashboard 
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          } 
        />

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Redirect any unknown route to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
