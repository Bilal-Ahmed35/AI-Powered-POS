import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Check, X, ShieldAlert, ShoppingCart, RefreshCw, AlertCircle, Eye, ToggleLeft, ToggleRight, Plus, Edit, Trash2 } from 'lucide-react';

const VendorDashboard = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('vendor_activeTab') || 'verification'); // 'verification', 'active', 'menu'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal viewer state
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Menu item CRUD modal states
  const [showModal, setShowModal] = useState(false); // false, 'add', 'edit'
  const [modalData, setModalData] = useState({
    id: null,
    name: '',
    price: '',
    type: 'food',
    category: 'Food',
    stock: '50',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('vendor_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
    fetchMenu();

    const socket = getSocket();
    if (socket) {
      // Connect to vendor socket rooms
      socket.on('order:new', (newOrder) => {
        console.log('Vendor received new order:', newOrder);
        setOrders((prev) => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
          return [newOrder, ...prev];
        });
      });

      socket.on('order:update', (updatedOrder) => {
        console.log('Vendor received order update:', updatedOrder);
        setOrders((prev) => {
          const exists = prev.some(o => o.id === updatedOrder.id);
          if (exists) return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          return [updatedOrder, ...prev];
        });
      });

      socket.on('payment:verify', (updatedOrder) => {
        console.log('Vendor received payment verify alert:', updatedOrder);
        setOrders((prev) => {
          const exists = prev.some(o => o.id === updatedOrder.id);
          if (exists) return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          return [updatedOrder, ...prev];
        });
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
        socket.off('menu:update');
        socket.off('inventory:update');
      }
    };
  }, []);

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

  const handleVerifyPayment = async (orderId) => {
    setError('');
    try {
      const response = await api.put(`/payments/${orderId}/verify`, { approve: true });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? response.data.order : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(response.data.order);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to verify payment.');
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
      stock: parseInt(modalData.stock),
      description: modalData.description,
      isActive: modalData.isActive
    };

    try {
      if (showModal === 'add') {
        await api.post('/menu', payload);
      } else if (showModal === 'edit') {
        await api.put(`/menu/${modalData.id}`, payload);
      }
      setShowModal(false);
      fetchMenu();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save menu item.');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    setError('');
    try {
      const response = await api.delete(`/menu/${itemId}`);
      alert(response.data.message);
      fetchMenu();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete menu item.');
    }
  };

  // Filter orders
  const verificationOrders = orders.filter((o) => o.status === 'PENDING' && (o.paymentTxId || o.paymentMethod === 'COD'));
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
              onClick={fetchOrders}
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

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 animate-glow-pulse">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigator */}
        <div className="p-1 bg-[var(--card-bg)]/60 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl inline-flex w-full md:w-auto transition-colors duration-300">
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
                        <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">ORDER ID</span>
                        <h4 className="font-extrabold text-[var(--text-main)] text-base mt-0.5 font-mono">#000{order.id}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase ${
                        order.paymentMethod === 'COD'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                      }`}>
                        {order.paymentMethod}
                      </span>
                    </div>

                    <div className="p-4 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] space-y-2.5 font-sans">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-[var(--text-muted)]">TxID Ref:</span>
                        <strong className="text-[var(--text-main)] font-mono select-all bg-[var(--card-bg)] px-2 py-0.5 rounded border border-[var(--border-color)]">{order.paymentTxId || 'COD Order'}</strong>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Customer:</span>
                        <strong className="text-[var(--text-main)]">{order.user?.name || 'Guest'}</strong>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Table Placement:</span>
                        <strong className="text-[var(--text-main)]">{order.tableId || 'Takeaway'}</strong>
                      </div>
                    </div>

                    <div className="text-sm font-extrabold text-indigo-400 flex justify-between items-center border-t border-[var(--border-color)] pt-3">
                      <span className="text-[var(--text-muted)] font-medium">Subtotal Due:</span>
                      <span className="text-lg text-[var(--text-main)] font-mono">${order.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
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
                      <span>Verify & Approve</span>
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
                        <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">ORDER ID</span>
                        <h4 className="font-extrabold text-[var(--text-main)] text-base mt-0.5 font-mono">#000{order.id}</h4>
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
                        <strong className="text-[var(--text-main)]">{order.tableId || 'Takeaway'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Order Quantity:</span>
                        <strong className="text-indigo-400">
                          {order.orderItems?.reduce((acc, it) => acc + it.quantity, 0) || 0} items
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2.5 pt-2 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-3 bg-[var(--bg-color)] border border-[var(--border-color)] hover:bg-[var(--bg-color)]/60 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                    
                    {order.status === 'READY' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/20 border border-emerald-500/20 cursor-pointer transition-colors"
                      >
                        Complete Order
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-xl text-xs font-semibold flex items-center justify-center space-x-2"
                      >
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                        <span>Kitchen Preparing...</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--card-bg)]/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">Menu Item Management</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Configure stock quantities, item descriptions, availability and create new recipes.</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/10 border border-indigo-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Menu Item</span>
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-[var(--text-main)]">
                <thead>
                  <tr className="bg-[var(--bg-color)] text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase tracking-wider text-[9px] font-bold">
                    <th className="p-4.5 font-semibold">Name & Details</th>
                    <th className="p-4.5 font-semibold">Category</th>
                    <th className="p-4.5 font-semibold">Type</th>
                    <th className="p-4.5 font-semibold">Price</th>
                    <th className="p-4.5 font-semibold">Stock Qty</th>
                    <th className="p-4.5 font-semibold text-center">Active Status</th>
                    <th className="p-4.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {menu.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4.5 font-medium text-[var(--text-main)] max-w-xs">
                        <div>
                          <p className="text-sm font-semibold tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{item.description || 'No description provided'}</p>
                        </div>
                      </td>
                      <td className="p-4.5">
                        <span className="px-2.5 py-0.5 bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 rounded-md font-semibold text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4.5">
                        <span className="px-2.5 py-0.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-md uppercase font-mono text-[9px]">
                          {item.type || 'food'}
                        </span>
                      </td>
                      <td className="p-4.5 font-mono font-bold text-[var(--text-main)]">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="p-4.5">
                        <span className={`font-bold ${item.stock <= 5 ? 'text-rose-400 animate-pulse font-extrabold' : 'text-[var(--text-main)]'}`}>
                          {item.stock} units
                        </span>
                      </td>
                      <td className="p-4.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className={`text-[10px] font-bold ${item.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {item.isActive ? 'Active' : 'Hidden'}
                          </span>
                          <button
                            onClick={() => handleToggleMenu(item.id, item.isActive)}
                            className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                          >
                            {item.isActive ? (
                              <ToggleRight className="w-8 h-8 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-4.5 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-[var(--bg-color)] border border-[var(--border-color)] hover:bg-[var(--bg-color)]/60 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-2 bg-red-950/10 border border-red-900/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* View Order Modal - Receipt Invoice styling */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] pointer-events-none" />

            <div className="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] text-indigo-400 font-extrabold tracking-wider font-mono">ORDER RECEIPT</span>
                <h3 className="font-extrabold text-[var(--text-main)] text-lg mt-0.5 font-mono">#000{selectedOrder.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs text-[var(--text-main)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Placement:</span>
                <strong className="text-[var(--text-main)]">{selectedOrder.tableId ? `Table ${selectedOrder.tableId}` : 'Takeaway / Delivery'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Customer:</span>
                <strong className="text-[var(--text-main)]">{selectedOrder.user?.name || 'Guest User'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Status:</span>
                <strong className="text-indigo-400 font-extrabold">{selectedOrder.status}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Method:</span>
                <strong className="text-[var(--text-main)] font-mono">{selectedOrder.paymentMethod === 'COD' ? 'Pay Cash' : selectedOrder.paymentMethod}</strong>
              </div>
            </div>

            {/* Simulated Receipt Items */}
            <div className="border-t border-b border-dashed border-[var(--border-color)] py-4 my-2 max-h-48 overflow-y-auto space-y-3 scrollbar-none">
              <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider block uppercase">Ordered Items</span>
              <div className="space-y-2.5">
                {selectedOrder.orderItems?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs items-center">
                    <span className="text-[var(--text-main)] font-medium">
                      {item.menuItem?.name} <span className="text-[var(--text-muted)] text-[10px] ml-1">× {item.quantity}</span>
                    </span>
                    <span className="text-[var(--text-main)] font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-[var(--text-main)] border-t border-[var(--border-color)] pt-3">
              <span className="text-[var(--text-muted)] font-medium">Total Paid:</span>
              <span className="text-indigo-400 text-lg font-mono">${selectedOrder.total.toFixed(2)}</span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] hover:text-indigo-500 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Menu Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSubmitMenuItem} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] pointer-events-none" />
            
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">
                {showModal === 'add' ? 'Create New Item' : 'Edit Menu Details'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={modalData.name}
                    onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                    placeholder="e.g. Double Beef Cheeseburger"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] placeholder-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Price (USD / $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={modalData.price}
                    onChange={(e) => setModalData({ ...modalData, price: e.target.value })}
                    placeholder="e.g. 5.99"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] placeholder-[var(--text-muted)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    value={modalData.type}
                    onChange={(e) => setModalData({ ...modalData, type: e.target.value })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] cursor-pointer"
                  >
                    <option value="food" className="bg-[var(--card-bg)] text-[var(--text-main)]">Food</option>
                    <option value="drink" className="bg-[var(--card-bg)] text-[var(--text-main)]">Drink</option>
                    <option value="dessert" className="bg-[var(--card-bg)] text-[var(--text-main)]">Dessert</option>
                    <option value="sides" className="bg-[var(--card-bg)] text-[var(--text-main)]">Sides</option>
                    <option value="other" className="bg-[var(--card-bg)] text-[var(--text-main)]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={modalData.category}
                    onChange={(e) => setModalData({ ...modalData, category: e.target.value })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] cursor-pointer"
                  >
                    <option value="Food" className="bg-[var(--card-bg)] text-[var(--text-main)]">Food</option>
                    <option value="Sides" className="bg-[var(--card-bg)] text-[var(--text-main)]">Sides</option>
                    <option value="Beverages" className="bg-[var(--card-bg)] text-[var(--text-main)]">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Stock Level
                  </label>
                  <input
                    type="number"
                    required
                    value={modalData.stock}
                    onChange={(e) => setModalData({ ...modalData, stock: e.target.value })}
                    placeholder="50"
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] placeholder-[var(--text-muted)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Item Description
                </label>
                <textarea
                  value={modalData.description}
                  onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                  placeholder="Detail menu item ingredients, serving portions, allergens, prep conditions..."
                  rows={3}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none font-sans"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="modal_item_active"
                  checked={modalData.isActive}
                  onChange={(e) => setModalData({ ...modalData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-600 focus:ring-indigo-500 bg-[var(--input-bg)] cursor-pointer"
                />
                <label htmlFor="modal_item_active" className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer select-none">
                  Available for ordering (Publish Item)
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-650/15 border border-indigo-400/20 transition-colors cursor-pointer"
              >
                {showModal === 'add' ? 'Create Recipe' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
