import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import {
  TrendingUp,
  Package,
  Layers,
  Users,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  BrainCircuit,
  Search,
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  Calendar,
  Check,
  X,
  ShoppingBag,
  Clock,
  ShieldCheck,
  QrCode,
  Printer,
  Download,
  ExternalLink,
  Flame,
  Trophy
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const AdminDashboard = ({ user, onLogout }) => {
  const [adminTab, setAdminTab] = useState('analytics'); // 'analytics', 'staff', 'orders'
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month', 'year'

  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [alertsContext, setAlertsContext] = useState(null);
  
  // Forecast state
  const [selectedItemId, setSelectedItemId] = useState(() => localStorage.getItem('admin_selectedItemId') || '');
  const [forecastData, setForecastData] = useState(null);
  const [forecastingLoading, setForecastingLoading] = useState(false);

  // Restock form state
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockReason, setRestockReason] = useState('Weekly shipment');

  // Staff Management state
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'VENDOR' });
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Order Search & History state
  const [adminOrders, setAdminOrders] = useState([]);
  const [orderSearchEmail, setOrderSearchEmail] = useState('');
  const [orderSearchTable, setOrderSearchTable] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);

  // QR Codes state
  const [tableQRs, setTableQRs] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedTableQR, setSelectedTableQR] = useState(null);
  const [qrCount, setQrCount] = useState(12);
  const [singleTableInput, setSingleTableInput] = useState('1');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    localStorage.setItem('admin_selectedItemId', selectedItemId);
  }, [selectedItemId]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchDashboardData();
      fetchStaffList();
      fetchAdminOrders();
      fetchTableQRs(12);
    }

    const socket = getSocket();
    if (socket) {
      const handleRealtimeSync = () => {
        if (user && user.role === 'ADMIN') {
          fetchDashboardData();
          fetchAdminOrders();
        }
      };

      socket.on('order:new', handleRealtimeSync);
      socket.on('order:update', handleRealtimeSync);
      socket.on('payment:verify', handleRealtimeSync);
      socket.on('inventory:update', handleRealtimeSync);
      socket.on('menu:update', handleRealtimeSync);

      return () => {
        socket.off('order:new', handleRealtimeSync);
        socket.off('order:update', handleRealtimeSync);
        socket.off('payment:verify', handleRealtimeSync);
        socket.off('inventory:update', handleRealtimeSync);
        socket.off('menu:update', handleRealtimeSync);
      };
    }
  }, [user, period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, invRes, logsRes, alertsRes] = await Promise.all([
        api.get(`/admin/stats?period=${period}`),
        api.get('/inventory'),
        api.get('/inventory/logs'),
        api.get('/inventory/alerts'),
      ]);
      setStats(statsRes.data);
      setInventory(invRes.data.items);
      setLogs(logsRes.data.logs);
      setAlerts(alertsRes.data.alerts || []);
      setAlertsContext(alertsRes.data.context || null);
      
      if (invRes.data.items.length > 0 && !selectedItemId) {
        setSelectedItemId(invRes.data.items[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    setStaffLoading(true);
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data.staff || []);
    } catch (err) {
      console.error('Fetch staff error:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchAdminOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (orderSearchEmail) params.append('email', orderSearchEmail);
      if (orderSearchTable) params.append('tableId', orderSearchTable);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      setAdminOrders(res.data.orders || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', staffForm);
      setShowAddStaffModal(false);
      setStaffForm({ name: '', email: '', password: '', role: 'VENDOR' });
      fetchStaffList();
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create staff account.');
    }
  };

  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    try {
      await api.put(`/admin/staff/${staffId}/status`, { isActive: !currentStatus });
      fetchStaffList();
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update account status.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordModal || !newPassword) return;
    try {
      await api.put(`/admin/staff/${resetPasswordModal.id}/password`, { newPassword });
      alert('Password reset successfully!');
      setResetPasswordModal(null);
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockQty || parseFloat(restockQty) <= 0) return;

    try {
      await api.post(`/inventory/${restockItem.id}/restock`, {
        quantity: parseFloat(restockQty),
        reason: restockReason,
      });
      setRestockItem(null);
      setRestockQty('');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to complete restocking.');
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedItemId) return;
    setForecastingLoading(true);
    try {
      const res = await api.get(`/inventory/${selectedItemId}/forecast`);
      const itemData = res.data;

      const sales = itemData.historicalSales || [10, 15, 12, 18, 22, 19, 25];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const points = sales.map((val, idx) => ({
        day: days[idx % 7],
        sales: val,
      }));

      points.push({
        day: 'Tomorrow (AI)',
        sales: Math.round(itemData.forecast),
      });

      setForecastData({
        ...itemData,
        points,
      });
    } catch (err) {
      console.error('Forecast error:', err);
    } finally {
      setForecastingLoading(false);
    }
  };

  const fetchTableQRs = async (count = qrCount) => {
    setQrLoading(true);
    try {
      const res = await api.get(`/admin/qr/batch?count=${count}`);
      setTableQRs(res.data.tables || []);
    } catch (err) {
      console.error('Fetch QRs error:', err);
      showToast('Failed to generate table QR codes', 'error');
    } finally {
      setQrLoading(false);
    }
  };

  const fetchSingleQR = async (tId) => {
    if (!tId) return;
    setQrLoading(true);
    try {
      const res = await api.get(`/admin/qr/${encodeURIComponent(tId)}`);
      setSelectedTableQR(res.data);
      showToast(`QR for Table ${tId} generated successfully!`);
    } catch (err) {
      console.error('Fetch single QR error:', err);
      showToast(`Failed to generate QR for Table ${tId}`, 'error');
    } finally {
      setQrLoading(false);
    }
  };

  const handlePrintQR = (table) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print table QR card', 'error');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${table.tableId} QR - SWIPEBITE</title>
          <style>
            @page { size: A5 landscape; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              margin: 0;
              background: #fff;
              color: #0f172a;
            }
            .card {
              border: 3px solid #1e1b4b;
              border-radius: 24px;
              padding: 36px 44px;
              text-align: center;
              max-width: 420px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            }
            .brand {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #4f46e5;
              text-transform: uppercase;
            }
            .tagline {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-top: 4px;
              margin-bottom: 20px;
            }
            .table-badge {
              display: inline-block;
              background: #1e1b4b;
              color: #ffffff;
              font-size: 22px;
              font-weight: 800;
              padding: 8px 24px;
              border-radius: 12px;
              margin-bottom: 20px;
              letter-spacing: 0.5px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              padding: 8px;
              background: #fff;
            }
            .instruction {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 18px;
            }
            .subtext {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
            }
            .url {
              font-size: 9px;
              color: #94a3b8;
              font-family: monospace;
              margin-top: 14px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">🍽️ SWIPEBITE</div>
            <div class="tagline">Smart University Canteen</div>
            <div class="table-badge">TABLE ${table.tableId}</div>
            <br/>
            <img class="qr-img" src="${table.qrDataUrl}" alt="Table ${table.tableId} QR" />
            <div class="instruction">Scan with Phone Camera to Order</div>
            <div class="subtext">Browse Menu • Verify OTP • Pay & Track Live</div>
            <div class="url">${table.url}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllQRs = () => {
    if (tableQRs.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print table QR cards', 'error');
      return;
    }
    const cardsHtml = tableQRs.map(table => `
      <div class="card page-break">
        <div class="brand">🍽️ SWIPEBITE</div>
        <div class="tagline">Smart University Canteen</div>
        <div class="table-badge">TABLE ${table.tableId}</div>
        <br/>
        <img class="qr-img" src="${table.qrDataUrl}" alt="Table ${table.tableId} QR" />
        <div class="instruction">Scan with Phone Camera to Order</div>
        <div class="subtext">Browse Menu • Verify OTP • Pay & Track Live</div>
        <div class="url">${table.url}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Table QRs - SWIPEBITE</title>
          <style>
            @page { size: A5 landscape; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #fff;
              color: #0f172a;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
              height: 90vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .card {
              border: 3px solid #1e1b4b;
              border-radius: 24px;
              padding: 30px 40px;
              text-align: center;
              max-width: 400px;
              margin: auto;
            }
            .brand {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #4f46e5;
              text-transform: uppercase;
            }
            .tagline {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-top: 4px;
              margin-bottom: 16px;
            }
            .table-badge {
              display: inline-block;
              background: #1e1b4b;
              color: #ffffff;
              font-size: 20px;
              font-weight: 800;
              padding: 6px 20px;
              border-radius: 10px;
              margin-bottom: 16px;
            }
            .qr-img {
              width: 200px;
              height: 200px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              padding: 6px;
              background: #fff;
            }
            .instruction {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 14px;
            }
            .subtext {
              font-size: 10px;
              color: #64748b;
              margin-top: 3px;
            }
            .url {
              font-size: 8px;
              color: #94a3b8;
              font-family: monospace;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] p-6 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10 animate-fade-in">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl transition-colors duration-300">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                Admin Operations & Analytics
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-main)] mt-1.5 font-display tracking-tight">Executive Management</h1>
          </div>

          {/* Tab & Period Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Top Navigation Tabs */}
            <div className="flex bg-[var(--bg-color)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                onClick={() => setAdminTab('analytics')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  adminTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setAdminTab('staff')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  adminTab === 'staff'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Staff Management
              </button>
              <button
                onClick={() => setAdminTab('orders')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  adminTab === 'orders'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Order Audit
              </button>
              <button
                onClick={() => {
                  setAdminTab('qrcodes');
                  if (tableQRs.length === 0) fetchTableQRs();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  adminTab === 'qrcodes'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Table QR Codes
              </button>
            </div>

            <button
              onClick={fetchDashboardData}
              className="p-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-all cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
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
            <button onClick={() => setToastMessage(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-2.5">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: ANALYTICS & METRICS */}
        {adminTab === 'analytics' && (
          <>
            {/* Time Period Filter Selector */}
            <div className="flex justify-between items-center bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl shadow-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-[var(--text-main)]">Filter Period:</span>
              </div>
              <div className="flex bg-[var(--bg-color)] p-1 rounded-xl border border-[var(--border-color)]">
                {['day', 'week', 'month', 'year'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      period === p
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 4 Key Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-2xl shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Total Revenue ({period})</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] font-mono">
                  Rs. {stats?.metrics?.totalRevenue ? stats.metrics.totalRevenue.toLocaleString() : '0'}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-sans">Verified completed sales in selected period.</p>
              </div>

              <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-2xl shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Active Queue</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] font-mono">
                  {stats?.metrics?.activeOrdersCount || 0}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-sans">Orders currently in kitchen/preparation pipeline.</p>
              </div>

              <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-2xl shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Stock Warnings</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-amber-400 font-mono">
                  {stats?.metrics?.lowStockCount || 0}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-sans">Items at or below safety threshold.</p>
              </div>

              <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-2xl shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">Users Registered</span>
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] font-mono">
                  {stats?.metrics?.usersCount || 0}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-sans">Total staff & customer registered accounts.</p>
              </div>
            </div>

            {/* AI Inventory Demand Regression forecasting section */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
                  <div className="flex items-center space-x-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">AI Inventory Demand Forecaster</h3>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="flex-1 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Inventory Dish to Forecast...</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.stockLevel} {item.unit} in stock)
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleGenerateForecast}
                    disabled={!selectedItemId || forecastingLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{forecastingLoading ? 'Computing ML...' : 'Run Demand Forecast'}</span>
                  </button>
                </div>

                {forecastData && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Predicted Next-Day Demand</span>
                        <strong className="text-xl font-extrabold text-indigo-400 font-mono mt-1 block">
                          {Math.round(forecastData.forecast)} units
                        </strong>
                      </div>
                      <div className="p-4 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">R² ML Confidence</span>
                        <strong className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">
                          {Math.round(forecastData.confidence * 100)}%
                        </strong>
                      </div>
                    </div>

                    <div className="h-44 w-full text-[10px] pr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData.points}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="day" stroke="var(--text-muted)" tickLine={false} />
                          <YAxis stroke="var(--text-muted)" tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card-bg)',
                              borderColor: 'var(--border-color)',
                              borderRadius: '12px',
                              color: 'var(--text-main)',
                              fontSize: '11px',
                            }}
                          />
                          <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="#6366f1" fillOpacity={0.15} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Stockout Alerts Sidebar */}
              <div className="lg:col-span-5 bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                  <h3 className="font-extrabold text-[var(--text-main)] text-sm font-display">AI Stockout Risk Alerts</h3>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-md font-mono font-bold">
                    {alerts.length} Warnings
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {alerts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                      All inventory items are above safety thresholds.
                    </div>
                  ) : (
                    alerts.map((alt) => (
                      <div key={alt.id} className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <strong className="text-[var(--text-main)] font-bold">{alt.name}</strong>
                          <span className="text-[10px] font-bold text-amber-400 uppercase">{alt.alertType}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{alt.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Top Selling Items Section */}
            <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">Top Selling Dishes & Beverages ({period})</h3>
                </div>
                <span className="text-[11px] font-bold text-[var(--text-muted)]">By Paid Order Volume</span>
              </div>

              {(!stats?.topItems || stats.topItems.length === 0) ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No verified sales recorded in this period yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.topItems.map((item, idx) => (
                    <div key={item.name} className="p-4 bg-[var(--bg-color)]/70 border border-[var(--border-color)] rounded-xl flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                          idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <strong className="text-xs font-bold text-[var(--text-main)] block truncate">{item.name}</strong>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">{item.category || 'Food'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-indigo-400 font-mono block">{item.quantity} sold</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">Rs. {item.revenue ? item.revenue.toLocaleString() : '0'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: STAFF MANAGEMENT */}
        {adminTab === 'staff' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Staff Account Management</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage Cashier, Kitchen, and Admin staff credentials, passwords, and access statuses.</p>
              </div>

              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Account</span>
              </button>
            </div>

            {/* Staff List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-bold tracking-wider text-[9px] bg-[var(--bg-color)]/60">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4 font-bold text-[var(--text-main)]">{st.name}</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{st.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                          st.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : st.role === 'VENDOR'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {st.role === 'VENDOR' ? 'CASHIER' : st.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                          st.isActive !== false
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {st.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setResetPasswordModal(st)}
                          className="px-3 py-1 bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-indigo-500/30 text-[var(--text-main)] rounded-lg font-bold transition-all text-[11px] cursor-pointer inline-flex items-center space-x-1"
                        >
                          <KeyRound className="w-3 h-3 text-indigo-400" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => handleToggleStaffStatus(st.id, st.isActive !== false)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer inline-flex items-center space-x-1 ${
                            st.isActive !== false
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {st.isActive !== false ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{st.isActive !== false ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDER AUDIT & SEARCH */}
        {adminTab === 'orders' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Order Search & History Audit</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Inspect verified customer email addresses, QR tables, and order amounts.</p>
              </div>

              {/* Search Filters */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Email..."
                    value={orderSearchEmail}
                    onChange={(e) => setOrderSearchEmail(e.target.value)}
                    className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 pl-9 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Table..."
                    value={orderSearchTable}
                    onChange={(e) => setOrderSearchTable(e.target.value)}
                    className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500 w-32"
                  />
                </div>

                <button
                  onClick={fetchAdminOrders}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-bold tracking-wider text-[9px] bg-[var(--bg-color)]/60">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Verified Customer Email</th>
                    <th className="p-4">QR Table</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Order Status</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {adminOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-[var(--text-main)]">#000{ord.id}</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">
                        {ord.customerEmail || ord.user?.email || 'customer@university.edu'}
                      </td>
                      <td className="p-4 font-bold text-[var(--text-main)]">{ord.tableId || 'Takeaway'}</td>
                      <td className="p-4 font-mono font-bold text-indigo-400">Rs. {ord.total.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                          ord.status === 'PAID' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                          ord.status === 'PREPARING' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          ord.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          ord.status === 'COMPLETED' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{ord.paymentMethod || 'COD'}</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">
                        {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TABLE QR CODE MANAGEMENT */}
        {adminTab === 'qrcodes' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Toolbar */}
            <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Table QR Code Print Center</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Generate, test, and print physical table stand cards with instant camera ordering links.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-[var(--bg-color)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Tables:</span>
                  <select
                    value={qrCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10);
                      setQrCount(count);
                      fetchTableQRs(count);
                    }}
                    className="bg-transparent text-xs font-bold text-[var(--text-main)] focus:outline-none cursor-pointer"
                  >
                    <option value="6">6 Tables</option>
                    <option value="12">12 Tables</option>
                    <option value="20">20 Tables</option>
                    <option value="30">30 Tables</option>
                    <option value="50">50 Tables</option>
                  </select>
                </div>

                <button
                  onClick={() => fetchTableQRs(qrCount)}
                  disabled={qrLoading}
                  className="px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-indigo-500/30 text-[var(--text-main)] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  onClick={handlePrintAllQRs}
                  disabled={tableQRs.length === 0 || qrLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print All Table Cards</span>
                </button>
              </div>
            </div>

            {/* Custom Table QR Generator Card */}
            <div className="bg-[var(--card-bg)]/30 backdrop-blur-xl border border-[var(--border-color)] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <strong className="text-xs font-bold text-[var(--text-main)] block">Generate Custom Table or Booth QR</strong>
                <span className="text-[11px] text-[var(--text-muted)]">Create a QR for special dining sections, balcony tables, or VIP booths.</span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. Patio-3 or VIP"
                  value={singleTableInput}
                  onChange={(e) => setSingleTableInput(e.target.value)}
                  className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500 w-36"
                />
                <button
                  onClick={() => fetchSingleQR(singleTableInput)}
                  disabled={!singleTableInput || qrLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Grid of Table QR Cards */}
            {qrLoading && tableQRs.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)]">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                <span>Generating high-resolution table QR codes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {tableQRs.map((t) => (
                  <div
                    key={t.tableId}
                    className="bg-[var(--card-bg)]/50 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-5 shadow-lg hover:border-indigo-500/30 transition-all flex flex-col items-center text-center space-y-4 group"
                  >
                    {/* Header Badge */}
                    <div className="flex items-center justify-between w-full">
                      <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-lg uppercase tracking-wider">
                        Table {t.tableId}
                      </span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-indigo-400 p-1 rounded-md transition-colors"
                        title="Open in new tab to test customer view"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* QR Image Container */}
                    <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-200">
                      <img
                        src={t.qrDataUrl}
                        alt={`QR code for Table ${t.tableId}`}
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    </div>

                    {/* Instructions & Link */}
                    <div className="space-y-1 w-full">
                      <p className="text-[11px] font-bold text-[var(--text-main)]">Camera Scan Ordering</p>
                      <p className="text-[9px] text-[var(--text-muted)] font-mono truncate px-2">
                        /customer/table/{t.tableId}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-1">
                      <button
                        onClick={() => handlePrintQR(t)}
                        className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => setSelectedTableQR(t)}
                        className="py-2 px-3 bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-indigo-500/30 text-[var(--text-main)] rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: SINGLE TABLE QR PREVIEW & DOWNLOAD */}
        {selectedTableQR && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl animate-fade-in text-center">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">
                  Table {selectedTableQR.tableId} QR Stand Card
                </h3>
                <button onClick={() => setSelectedTableQR(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">✕</button>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-200">
                <img
                  src={selectedTableQR.qrDataUrl}
                  alt={`Table ${selectedTableQR.tableId} QR`}
                  className="w-56 h-56 object-contain rounded-lg mx-auto"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-wide block">
                  🍽️ SWIPEBITE Canteen System
                </span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Place this code on physical Table {selectedTableQR.tableId} for customers to order directly.
                </p>
                <div className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-color)] p-2 rounded-xl border border-[var(--border-color)] break-all mt-2">
                  {selectedTableQR.url}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <a
                  href={selectedTableQR.qrDataUrl}
                  download={`swipebite-table-${selectedTableQR.tableId}-qr.png`}
                  className="flex-1 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-indigo-500/30 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => handlePrintQR(selectedTableQR)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Card</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD STAFF */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">Add New Staff Account</h3>
                <button onClick={() => setShowAddStaffModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main)]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. John Cashier"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main)]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="staff@pos.com"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main)]">Password</label>
                  <input
                    type="password"
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main)]">Assign Staff Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="VENDOR">Cashier POS (VENDOR)</option>
                    <option value="KITCHEN">Kitchen Staff (KITCHEN)</option>
                    <option value="ADMIN">System Admin (ADMIN)</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="flex-1 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESET PASSWORD */}
        {resetPasswordModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">Reset Password</h3>
                <button onClick={() => setResetPasswordModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">✕</button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Enter a new password for <strong className="text-[var(--text-main)]">{resetPasswordModal.name}</strong> ({resetPasswordModal.email}).
              </p>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-main)]">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal(null)}
                    className="flex-1 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
