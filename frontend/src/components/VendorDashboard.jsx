import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Check, X, ShieldAlert, ShoppingCart, RefreshCw, AlertCircle, Eye, ToggleLeft, ToggleRight, Plus, Edit, Trash2, Banknote, Smartphone, Clock } from 'lucide-react';

const VendorDashboard = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('vendor_activeTab') || 'verification'); // 'verification', 'active', 'menu'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment availability settings state
  const [paymentSettings, setPaymentSettings] = useState({ codEnabled: true, onlineEnabled: true });

  // Modal viewer state
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Menu item CRUD modal states
  const [showModal, setShowModal] = useState(false); // false, 'add', 'edit'
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [modalData, setModalData] = useState({
    id: null,
    name: '',
    price: '',
    type: 'food',
    category: 'Food',
    stock: '50',
    prepTime: '5',
    imageUrl: '',
    description: '',
    isActive: true
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    localStorage.setItem('vendor_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    fetchPaymentSettings();

    const socket = getSocket();
    if (socket) {
      socket.on('order:new', (newOrder) => {
        setOrders((prev) => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
          return [newOrder, ...prev];
        });
      });

      socket.on('order:update', (updatedOrder) => {
        setOrders((prev) => {
          const exists = prev.some(o => o.id === updatedOrder.id);
          if (exists) return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          return [updatedOrder, ...prev];
        });
      });

      socket.on('payment:verify', (updatedOrder) => {
        setOrders((prev) => {
          const exists = prev.some(o => o.id === updatedOrder.id);
          if (exists) return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          return [updatedOrder, ...prev];
        });
      });

      socket.on('paymentSettings:update', (updatedSettings) => {
        setPaymentSettings(updatedSettings);
      });

      socket.on('menu:update', () => {
        fetchMenu();
      });

      socket.on('inventory:update', () => {
        fetchMenu();
      });
    }

    return () => {
      if (socket) {
        socket.off('order:new');
        socket.off('order:update');
        socket.off('payment:verify');
        socket.off('paymentSettings:update');
        socket.off('menu:update');
        socket.off('inventory:update');
      }
    };
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data.orders);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu?all=true');
      setMenu(response.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await api.get('/payments/settings');
      setPaymentSettings(res.data);
    } catch (e) {
      console.warn('Fetch payment settings warning:', e.message);
    }
  };

  const handleTogglePaymentSetting = async (key, newValue) => {
    try {
      const res = await api.put('/payments/settings', { [key]: newValue });
      setPaymentSettings(res.data.settings);
      const label = key === 'codEnabled' ? 'COD (Pay at Counter)' : 'Online Payment';
      showToast(`${label} is now ${newValue ? 'OPEN' : 'CLOSED'}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update payment availability.');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    setError('');
    try {
      const response = await api.put(`/payments/${orderId}/verify`, { approve: true });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? response.data.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(response.data.order);
      }
      showToast(`Payment verified for order ${response.data.order.orderNumber || `#000${orderId}`}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to verify payment.');
    }
  };

  const handleRejectPayment = async (orderId) => {
    setError('');
    try {
      const response = await api.put(`/payments/${orderId}/verify`, { approve: false, reason: 'Payment verification rejected by staff.' });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? response.data.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(response.data.order);
      }
      showToast(`Payment rejected for order ${response.data.order.orderNumber || `#000${orderId}`}`, 'error');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reject payment.');
    }
  };

  const handleUpdateStatus = async (orderId, nextStatus) => {
    setError('');
    try {
      const response = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? response.data.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(response.data.order);
      }
      showToast(`Order status updated to ${nextStatus}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update order status.');
    }
  };

  const handleToggleMenu = async (itemId, currentActive) => {
    try {
      const response = await api.put(`/menu/${itemId}`, { isActive: !currentActive });
      setMenu((prev) => prev.map((item) => (item.id === itemId ? response.data.item : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddModal = () => {
    setModalData({
      id: null,
      name: '',
      price: '',
      type: 'food',
      category: 'Food',
      stock: '50',
      prepTime: '5',
      imageUrl: '',
      description: '',
      isActive: true
    });
    setShowModal('add');
  };

  const handleOpenEditModal = (item) => {
    setModalData({
      id: item.id,
      name: item.name,
      price: item.price.toString(),
      type: item.type || 'food',
      category: item.category,
      stock: item.stock.toString(),
      prepTime: (item.prepTime || 5).toString(),
      imageUrl: item.imageUrl || '',
      description: item.description || '',
      isActive: item.isActive
    });
    setShowModal('edit');
  };

  const handleSubmitMenuItem = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: modalData.name,
      price: parseFloat(modalData.price),
      type: modalData.type,
      category: modalData.category,
      stock: parseInt(modalData.stock, 10) || 0,
      prepTime: parseInt(modalData.prepTime, 10) || 5,
      imageUrl: modalData.imageUrl?.trim() || null,
      description: modalData.description,
      isActive: modalData.isActive
    };

    try {
      if (showModal === 'add') {
        const response = await api.post('/menu', payload);
        setMenu((prev) => [response.data.item, ...prev]);
        showToast(`Menu item "${payload.name}" added successfully!`);
      } else if (showModal === 'edit') {
        const response = await api.put(`/menu/${modalData.id}`, payload);
        setMenu((prev) => prev.map((it) => (it.id === modalData.id ? response.data.item : it)));
        showToast(`Menu item "${payload.name}" updated successfully!`);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save menu item.');
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.delete(`/menu/${deleteConfirmItem.id}`);
      setMenu((prev) => prev.filter((it) => it.id !== deleteConfirmItem.id));
      showToast(`Menu item "${deleteConfirmItem.name}" deleted successfully!`);
      setDeleteConfirmItem(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete menu item.');
    }
  };

  // Filter orders for Payment Verification Tab (both COD & Online)
  const verificationOrders = orders.filter(
    (o) =>
      ['PENDING', 'PAYMENT_PENDING'].includes(o.status) ||
      ['UNPAID', 'PENDING_VERIFICATION'].includes(o.paymentStatus)
  ).filter((o) => !['CANCELLED', 'COMPLETED', 'PAID', 'REFUNDED'].includes(o.status));

  const activeOrders = orders.filter((o) => ['PAID', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background radial glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 animate-fade-in">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl transition-colors duration-300">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                Cashier POS Terminal
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--text-main)] mt-1.5 tracking-tight font-display">Vendor Dashboard</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage customer transaction verifications, active kitchen orders, and menu item listings.</p>
          </div>
          
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => { fetchOrders(); fetchPaymentSettings(); }}
              className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--bg-color)]/60 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-all cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-red-650 to-rose-650 hover:from-red-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/20 cursor-pointer transition-all duration-200 border border-red-500/10 flex items-center justify-center space-x-1.5"
            >
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in ${
            toastMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* System Error Message */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Payment Method Control & Availability Section ────────────────── */}
        <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-extrabold text-base text-[var(--text-main)] font-display flex items-center space-x-2">
                <Banknote className="w-5 h-5 text-indigo-400" />
                <span>Payment Method Control &amp; Availability</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Control payment method availability for customer checkout in real time.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* COD Control Card */}
            <div className="p-4 bg-[var(--bg-color)]/60 border border-[var(--border-color)] rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-[var(--text-main)]">Pay at Counter (COD)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    paymentSettings.codEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {paymentSettings.codEnabled ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">Allow customers to pay cash at counter</p>
              </div>

              <button
                onClick={() => handleTogglePaymentSetting('codEnabled', !paymentSettings.codEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentSettings.codEnabled
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {paymentSettings.codEnabled ? 'Close COD' : 'Open COD'}
              </button>
            </div>

            {/* Online Payment Control Card */}
            <div className="p-4 bg-[var(--bg-color)]/60 border border-[var(--border-color)] rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-[var(--text-main)]">Online Payment</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    paymentSettings.onlineEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {paymentSettings.onlineEnabled ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">Easypaisa &amp; JazzCash mobile wallet</p>
              </div>

              <button
                onClick={() => handleTogglePaymentSetting('onlineEnabled', !paymentSettings.onlineEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentSettings.onlineEnabled
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {paymentSettings.onlineEnabled ? 'Close Online' : 'Open Online'}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-1.5 rounded-2xl shadow-xl transition-colors duration-300">
          <div className="flex flex-col md:flex-row gap-1 w-full">
            {[
              { id: 'verification', label: 'Payment Verifications', count: verificationOrders.length },
              { id: 'active', label: 'Active Orders Queue', count: activeOrders.length },
              { id: 'menu', label: 'Menu Availability', count: null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15 border border-indigo-400/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-color)]/30'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-[var(--bg-color)] text-indigo-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === 'verification' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {verificationOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[var(--card-bg)]/20 border border-[var(--border-color)] border-dashed rounded-3xl transition-colors duration-300">
                <ShieldAlert className="w-12 h-12 text-gray-550 mx-auto mb-4" />
                <p className="text-sm font-bold text-[var(--text-main)]">No Pending Verifications</p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto">Orders with pending transaction details or cash payments will list here.</p>
              </div>
            ) : (
              verificationOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[var(--card-bg)]/50 backdrop-blur-xl border border-[var(--border-color)] hover:border-indigo-500/20 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-lg hover:shadow-2xl transition-all duration-350"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">ORDER NUMBER</span>
                        <h4 className="font-extrabold text-[var(--text-main)] text-base mt-0.5 font-mono">{order.orderNumber || `#000${order.id}`}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase ${
                        order.paymentMethod === 'COD'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                      }`}>
                        {order.paymentMethod || 'COD'}
                      </span>
                    </div>

                    <div className="p-4 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] space-y-2 font-sans text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--text-muted)]">TxID Ref:</span>
                        <strong className="text-[var(--text-main)] font-mono select-all bg-[var(--card-bg)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                          {order.paymentTxId || 'COD / N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Customer:</span>
                        <strong className="text-[var(--text-main)]">{order.user?.name || 'Guest'} ({order.user?.email || order.customerEmail || 'N/A'})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Table Placement:</span>
                        <strong className="text-[var(--text-main)]">{order.tableNumber || order.tableId || 'Takeaway'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Payment Status:</span>
                        <strong className="text-amber-400 font-bold uppercase text-[11px]">{order.paymentStatus}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Order Status:</span>
                        <strong className="text-indigo-400 font-bold uppercase text-[11px]">{order.status}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--text-muted)]">Payment Time:</span>
                        <span className="text-[var(--text-muted)] font-mono">{new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="text-sm font-extrabold text-indigo-400 flex justify-between items-center border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-muted)] font-medium">Total Amount Due:</span>
                      <span className="text-lg text-[var(--text-main)] font-mono">Rs. {order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleRejectPayment(order.id)}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleVerifyPayment(order.id)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/10 border border-indigo-400/20 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify &amp; Approve</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[var(--card-bg)]/20 border border-[var(--border-color)] border-dashed rounded-3xl">
                <ShoppingCart className="w-12 h-12 text-gray-550 mx-auto mb-4" />
                <p className="text-sm font-bold text-[var(--text-main)]">Active Queue Empty</p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm mx-auto">Active paid and preparing orders will appear here as they flow from the kitchen.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[var(--card-bg)]/50 backdrop-blur-xl border border-[var(--border-color)] hover:border-indigo-500/20 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-lg transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">ORDER NUMBER</span>
                        <h4 className="font-extrabold text-[var(--text-main)] text-base mt-0.5 font-mono">{order.orderNumber || `#000${order.id}`}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                        order.status === 'PAID'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                          : order.status === 'PREPARING'
                          ? 'text-purple-400 bg-purple-500/10 border-purple-500/25'
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 animate-pulse'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--text-muted)] space-y-2 bg-[var(--bg-color)] p-3.5 rounded-xl border border-[var(--border-color)] font-sans">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Customer:</span>
                        <strong className="text-[var(--text-main)]">{order.user?.name || 'Guest'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Location / Table:</span>
                        <strong className="text-[var(--text-main)]">{order.tableNumber || order.tableId || 'Takeaway'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Order Quantity:</span>
                        <strong className="text-indigo-400">
                          {order.orderItems?.reduce((acc, it) => acc + it.quantity, 0) || 0} items
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    {order.status === 'PAID' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Send to Kitchen →
                      </button>
                    )}
                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        Mark Handed Over &amp; Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Menu Catalog Availability</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Toggle item availability or update stock levels.</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map((item) => (
                <div key={item.id} className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-main)]">{item.name}</h3>
                      <span className="text-xs text-[var(--text-muted)] font-mono">Rs. {item.price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleToggleMenu(item.id, item.isActive)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        item.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.isActive ? 'Available' : 'Disabled'}
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-color)] pt-3">
                    <span>Stock: <strong className="text-[var(--text-main)]">{item.stock}</strong></span>
                    <div className="flex space-x-2">
                      <button onClick={() => handleOpenEditModal(item)} className="p-1 text-indigo-400 hover:text-indigo-300">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirmItem(item)} className="p-1 text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
