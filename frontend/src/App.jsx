import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import StaffLogin from './components/StaffLogin';
import CustomerPortalPage from './pages/customer/CustomerPortalPage';
import CustomerCartPage from './pages/customer/CustomerCartPage';
import CashierPOSPage from './pages/cashier/CashierPOSPage';
import KitchenBoardPage from './pages/kitchen/KitchenBoardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import api from './services/api';
import { connectSocket, disconnectSocket } from './services/socket';
import { Sun, Moon, LogIn } from 'lucide-react';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }
    return { id: 0, role: 'CUSTOMER', name: 'Guest Customer', email: '', isGuest: true };
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        connectSocket(parsedUser);
      } catch (err) {
        console.error('Error parsing saved session:', err);
        handleLogout();
      }
    } else {
      connectSocket({ id: 0, role: 'CUSTOMER', name: 'Guest Customer', email: '', isGuest: true });
    }
  }, []);

  // Auto role session sync for development/testing demo navigation
  useEffect(() => {
    const path = location.pathname;
    let requiredRole = null;
    if (path.startsWith('/admin')) requiredRole = 'ADMIN';
    else if (path.startsWith('/cashier')) requiredRole = 'VENDOR';
    else if (path.startsWith('/kitchen')) requiredRole = 'KITCHEN';
    else if (path.startsWith('/customer')) requiredRole = 'CUSTOMER';

    if (requiredRole && user.role !== requiredRole && !user.isGuest) {
      autoAuthenticateRole(requiredRole);
    }
  }, [location.pathname]);

  const autoAuthenticateRole = async (targetRole) => {
    let email = 'customer@pos.com';
    if (targetRole === 'ADMIN') email = 'admin@pos.com';
    else if (targetRole === 'VENDOR') email = 'vendor@pos.com';
    else if (targetRole === 'KITCHEN') email = 'kitchen@pos.com';

    try {
      const response = await api.post('/auth/login', { email, password: 'password123' });
      const { user: loggedInUser, accessToken } = response.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      connectSocket(loggedInUser);
    } catch (err) {
      console.warn('Auto-authentication fallback for role:', targetRole, err.message);
      const simulatedUser = { ...user, role: targetRole };
      setUser(simulatedUser);
      connectSocket(simulatedUser);
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    connectSocket(loggedInUser);
    
    // Direct user to corresponding dashboard route upon login
    if (loggedInUser.role === 'ADMIN') navigate('/admin');
    else if (loggedInUser.role === 'VENDOR') navigate('/cashier');
    else if (loggedInUser.role === 'KITCHEN') navigate('/kitchen');
    else navigate('/customer');
  };

  const handleLogout = () => {
    // Clear authorization data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear simulated/persisted local application state keys
    localStorage.removeItem('customer_cart');
    localStorage.removeItem('customer_tableId');
    localStorage.removeItem('customer_category');
    localStorage.removeItem('customer_checkoutStep');
    localStorage.removeItem('customer_paymentMethod');
    localStorage.removeItem('customer_txId');
    localStorage.removeItem('vendor_activeTab');
    localStorage.removeItem('admin_selectedItemId');

    setUser({ id: 0, role: 'CUSTOMER', name: 'Guest Customer', email: '', isGuest: true });
    disconnectSocket();
    connectSocket({ id: 0, role: 'CUSTOMER', name: 'Guest Customer', email: '', isGuest: true });
    navigate('/login');
  };

  // Determine if we are on a customer-facing route (no top system navbar needed)
  const isCustomerRoute = location.pathname.startsWith('/customer');

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] flex flex-col transition-colors duration-300">
      {/* Top Application Header – hidden on customer routes */}
      {!isCustomerRoute && (
        <div className="bg-[var(--card-bg)] border-b border-[var(--border-color)] px-6 py-3 flex justify-between items-center z-40 transition-colors duration-300 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-indigo-500 font-extrabold tracking-wider uppercase">
              SwipeBite System
            </span>
          </div>

          {/* Active user details, Theme Toggle & Login/Logout button */}
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-[var(--text-muted)]">
              Account: <strong className="text-[var(--text-main)] font-semibold">{user.name}</strong>
            </span>
            
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] hover:text-indigo-500 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm"
              title="Toggle theme (Light/Dark)"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {user.isGuest ? (
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all cursor-pointer shadow-sm flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-gradient-to-r from-red-650 to-rose-655 hover:from-red-600 hover:to-rose-600 text-white rounded-lg font-bold transition-all cursor-pointer shadow-sm shadow-red-950/10 border border-red-500/10"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main workspace frame with independent routes */}
      <div className={`flex-1 w-full flex flex-col ${isCustomerRoute ? '' : 'max-w-7xl mx-auto px-4 md:px-6 justify-center'}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/customer" replace />} />
          <Route path="/login" element={<StaffLogin onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/customer" element={<CustomerPortalPage user={user} onLogout={handleLogout} />} />
          <Route path="/customer/table/:tableId" element={<CustomerPortalPage user={user} onLogout={handleLogout} />} />
          <Route path="/customer/cart" element={<CustomerCartPage user={user} onLogout={handleLogout} />} />
          <Route path="/cashier" element={<CashierPOSPage user={user} onLogout={handleLogout} />} />
          <Route path="/kitchen" element={<KitchenBoardPage user={user} onLogout={handleLogout} />} />
          <Route path="/admin" element={<AdminDashboardPage user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/customer" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
