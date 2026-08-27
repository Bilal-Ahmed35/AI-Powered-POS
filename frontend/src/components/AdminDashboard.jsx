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
  Trophy,
  Activity,
  Building2,
  Lock,
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
  const [adminTab, setAdminTab] = useState('analytics'); // 'analytics', 'staff', 'tables', 'orders', 'audit'
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

  // Table Management & QR Codes state
  const [tablesList, setTablesList] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTableQR, setSelectedTableQR] = useState(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState('');

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
      fetchTablesList();
      fetchAuditLogs();
    }

    const socket = getSocket();
    if (socket) {
      const handleRealtimeSync = () => {
        if (user && user.role === 'ADMIN') {
          fetchLightData();
          fetchAdminOrders();
          fetchTablesList();
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

  const fetchLightData = async () => {
    try {
      const [statsRes, invRes, logsRes] = await Promise.all([
        api.get(`/admin/stats?period=${period}`),
        api.get('/inventory'),
        api.get('/inventory/logs'),
      ]);
      setStats(statsRes.data);
      setInventory(invRes.data.items || []);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Fetch light data error:', err);
    }
  };

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
      setInventory(invRes.data.items || []);
      setLogs(logsRes.data.logs || []);
      setAlerts(alertsRes.data.alerts || []);
      setAlertsContext(alertsRes.data.context || null);
      
      if (invRes.data.items?.length > 0 && !selectedItemId) {
        setSelectedItemId(invRes.data.items[0].id.toString());
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateForecasts = async () => {
    setForecastingLoading(true);
    try {
      await api.post('/inventory/recalculate-forecasts');
      const alertsRes = await api.get('/inventory/alerts');
      setAlerts(alertsRes.data.alerts || []);
      setAlertsContext(alertsRes.data.context || null);
      showToast('AI Demand forecasts recalculated!');
    } catch (err) {
      console.error(err);
      showToast('Failed to recalculate forecasts', 'error');
    } finally {
      setForecastingLoading(false);
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

      const res = await api.get(`/orders?${params.toString()}`);
      setAdminOrders(res.data.orders || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchTablesList = async () => {
    setTablesLoading(true);
    try {
      const res = await api.get('/tables/qr/batch');
      setTablesList(res.data.tables || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!user || user.role !== 'ADMIN') return;
    setAuditLoading(true);
    try {
      const params = auditFilterAction ? `?action=${auditFilterAction}` : '';
      const res = await api.get(`/admin/audit-logs${params}`);
      setAuditLogs(res.data.logs || []);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    if (!newTableNumber) return;
    try {
      await api.post('/tables', { tableNumber: newTableNumber });
      showToast(`Table "${newTableNumber}" created successfully!`);
      setShowAddTableModal(false);
      setNewTableNumber('');
      fetchTablesList();
      fetchAuditLogs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create table.');
    }
  };

  const handleRegenerateQR = async (tableId, tableNumber) => {
    if (!confirm(`Are you sure you want to regenerate the cryptographic QR for ${tableNumber}? Any existing printed QR stand cards will become invalid.`)) return;
    try {
      await api.post(`/tables/${tableId}/regenerate-qr`);
      showToast(`QR token regenerated for ${tableNumber}. Old codes invalidated.`);
      fetchTablesList();
      fetchAuditLogs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to regenerate QR.');
    }
  };

  const handleToggleTableActive = async (tableId, currentStatus, tableNumber) => {
    try {
      await api.put(`/tables/${tableId}`, { isActive: !currentStatus });
      showToast(`Table ${tableNumber} is now ${!currentStatus ? 'Active' : 'Disabled'}.`);
      fetchTablesList();
      fetchAuditLogs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle table status.');
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
      fetchAuditLogs();
      showToast('Staff account created successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create staff account.');
    }
  };

  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    try {
      await api.put(`/admin/staff/${staffId}/status`, { isActive: !currentStatus });
      fetchStaffList();
      fetchDashboardData();
      fetchAuditLogs();
      showToast('Staff account status updated.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update account status.');
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
          <title>${table.tableNumber} QR - SWIPEBITE</title>
          <style>
            @page { size: A5 landscape; margin: 15mm; }
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 90vh; margin: 0; background: #fff; color: #0f172a; }
            .card { border: 3px solid #1e1b4b; border-radius: 24px; padding: 36px 44px; text-align: center; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
            .brand { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #4f46e5; text-transform: uppercase; }
            .tagline { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; margin-bottom: 20px; }
            .table-badge { display: inline-block; background: #1e1b4b; color: #ffffff; font-size: 22px; font-weight: 800; padding: 8px 24px; border-radius: 12px; margin-bottom: 20px; }
            .qr-img { width: 220px; height: 220px; border-radius: 16px; border: 1px solid #e2e8f0; padding: 8px; background: #fff; }
            .instruction { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 18px; }
            .subtext { font-size: 11px; color: #64748b; margin-top: 4px; }
            .url { font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 14px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">🍽️ SWIPEBITE</div>
            <div class="tagline">Smart University Canteen • ${table.branchName || 'Main Campus'}</div>
            <div class="table-badge">${table.tableNumber.toUpperCase()}</div>
            <br/>
            <img class="qr-img" src="${table.qrDataUrl}" alt="${table.tableNumber} QR" />
            <div class="instruction">Scan with Phone Camera to Order</div>
            <div class="subtext">Browse Menu • Verify OTP • Pay & Track Live</div>
            <div class="url">${table.url}</div>
          </div>
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllQRs = () => {
    if (tablesList.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print table QR cards', 'error');
      return;
    }
    const cardsHtml = tablesList.map(table => `
      <div class="card page-break">
        <div class="brand">🍽️ SWIPEBITE</div>
        <div class="tagline">Smart University Canteen • ${table.branchName || 'Main Campus'}</div>
        <div class="table-badge">${table.tableNumber.toUpperCase()}</div>
        <br/>
        <img class="qr-img" src="${table.qrDataUrl}" alt="${table.tableNumber} QR" />
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
            body { font-family: sans-serif; margin: 0; background: #fff; color: #0f172a; }
            .page-break { page-break-after: always; break-after: page; height: 90vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .card { border: 3px solid #1e1b4b; border-radius: 24px; padding: 30px 40px; text-align: center; max-width: 400px; margin: auto; }
            .brand { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #4f46e5; text-transform: uppercase; }
            .tagline { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; margin-bottom: 16px; }
            .table-badge { display: inline-block; background: #1e1b4b; color: #ffffff; font-size: 20px; font-weight: 800; padding: 6px 20px; border-radius: 10px; margin-bottom: 16px; }
            .qr-img { width: 200px; height: 200px; border-radius: 12px; border: 1px solid #e2e8f0; padding: 6px; background: #fff; }
            .instruction { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 14px; }
            .subtext { font-size: 10px; color: #64748b; margin-top: 3px; }
            .url { font-size: 8px; color: #94a3b8; font-family: monospace; margin-top: 10px; word-break: break-all; }
          </style>
        </head>
        <body>
          ${cardsHtml}
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
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
              <span className="text-xs text-[var(--text-muted)]">• SwipeBite Main Campus</span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-main)] mt-1.5 font-display tracking-tight">Executive Management</h1>
          </div>

          {/* Top Navigation Tabs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex bg-[var(--bg-color)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto max-w-full">
              <button
                onClick={() => setAdminTab('analytics')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setAdminTab('staff')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'staff' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Staff
              </button>
              <button
                onClick={() => {
                  setAdminTab('tables');
                  fetchTablesList();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'tables' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Tables & QRs
              </button>
              <button
                onClick={() => setAdminTab('orders')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => {
                  setAdminTab('audit');
                  fetchAuditLogs();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  adminTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Audit Logs
              </button>
            </div>

            <button
              onClick={() => {
                fetchDashboardData();
                fetchTablesList();
                fetchAuditLogs();
              }}
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
            toastMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* TAB 1: ANALYTICS & AI METRICS */}
        {adminTab === 'analytics' && stats && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-5 rounded-2xl shadow-md">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">Total Period Revenue</span>
                <h3 className="text-2xl font-black text-indigo-400 mt-1">Rs. {stats.metrics?.totalRevenue?.toFixed(2) || '0.00'}</h3>
                <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Verified &amp; Paid Orders</span>
              </div>

              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-5 rounded-2xl shadow-md">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">Active Kitchen Queue</span>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.metrics?.activeOrdersCount || 0} Orders</h3>
                <span className="text-[10px] text-[var(--text-muted)] font-bold mt-1 block">In Preparation / Ready</span>
              </div>

              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-5 rounded-2xl shadow-md">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">AI ETA Accuracy</span>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{stats.metrics?.etaAccuracy || 94.2}%</h3>
                <span className="text-[10px] text-[var(--text-muted)] font-bold mt-1 block">Avg Prep Time: {stats.metrics?.avgPrepTime || 8.5} mins</span>
              </div>

              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-5 rounded-2xl shadow-md">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-black">Stock Health Alerts</span>
                <h3 className="text-2xl font-black text-rose-400 mt-1">{stats.lowStockAlerts?.length || 0} Items</h3>
                <span className="text-[10px] text-rose-400 font-bold mt-1 block">Actionable Reorder Warnings</span>
              </div>
            </div>

            {/* AI Reorder Advice & Top Selling */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-black text-[var(--text-main)] flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Top Selling Menu Items</span>
                </h3>
                <div className="divide-y divide-[var(--border-color)]">
                  {stats.topItems?.map((item, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-[var(--text-main)] block font-bold">{item.name}</strong>
                        <span className="text-[var(--text-muted)] text-[10px]">Category: {item.category}</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-indigo-400 font-bold">{item.quantity} sold</strong>
                        <span className="text-[10px] text-[var(--text-muted)] block">Rs. {item.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Reorder Advice */}
              <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[var(--text-main)] flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    <span>AI Inventory Recommendations</span>
                  </h3>
                  <button
                    onClick={handleRecalculateForecasts}
                    disabled={forecastingLoading}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1"
                    title="Force recalculate fresh AI demand forecasts"
                  >
                    <RefreshCw className={`w-3 h-3 ${forecastingLoading ? 'animate-spin' : ''}`} />
                    <span>{forecastingLoading ? 'Calculating...' : 'Recalculate AI'}</span>
                  </button>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {stats.stockRecommendations?.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4">All inventory stock levels are healthy.</p>
                  ) : (
                    stats.stockRecommendations?.map((rec, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <strong className="text-[var(--text-main)] block font-bold">{rec.name}</strong>
                          <span className="text-[var(--text-muted)] text-[10px]">Current: {rec.currentStock} (Min: {rec.threshold})</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.urgency === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            +{rec.recommendedReorder} units advised
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STAFF MANAGEMENT */}
        {adminTab === 'staff' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Staff Accounts & Roles</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage credentials, staff assignments, and authorization.</p>
              </div>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Staff</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-bold tracking-wider text-[9px]">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4 font-bold text-[var(--text-main)]">{st.name}</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{st.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {st.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          st.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {st.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStaffStatus(st.id, st.isActive !== false)}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold border border-[var(--border-color)] hover:bg-[var(--bg-color)] cursor-pointer"
                        >
                          {st.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TABLE QR MANAGEMENT */}
        {adminTab === 'tables' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  <span>Physical Dining Table Management</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Cryptographically signed QR tokens prevent URL tampering. Regenerating invalidates printed cards.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowAddTableModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Table</span>
                </button>
                <button
                  onClick={handlePrintAllQRs}
                  disabled={tablesList.length === 0}
                  className="px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-indigo-500 text-[var(--text-main)] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print All Stand Cards</span>
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tablesList.map((t) => (
                <div
                  key={t.id}
                  className="bg-[var(--card-bg)]/50 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-5 shadow-lg flex flex-col items-center text-center space-y-4 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-lg uppercase">
                      {t.tableNumber}
                    </span>
                    <button
                      onClick={() => handleToggleTableActive(t.id, t.isActive, t.tableNumber)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        t.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-200">
                    <img src={t.qrDataUrl} alt={`${t.tableNumber} QR`} className="w-40 h-40 object-contain rounded-lg" />
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-full px-2">
                    Signed: {t.qrToken?.substring(0, 20)}...
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full pt-1">
                    <button
                      onClick={() => handlePrintQR(t)}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => handleRegenerateQR(t.id, t.tableNumber)}
                      className="py-2 bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-muted)] hover:text-rose-400 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                      title="Invalidate and generate new cryptographic token"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>New QR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ORDER AUDIT */}
        {adminTab === 'orders' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display">Order Search &amp; History Audit</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Inspect customer orders, items snapshot pricing, and status history.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-bold tracking-wider text-[9px] bg-[var(--bg-color)]/60">
                    <th className="p-4">Order Number</th>
                    <th className="p-4">Customer Email</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {adminOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-400">{ord.orderNumber || `#000${ord.id}`}</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{ord.customerEmail || ord.user?.email || 'N/A'}</td>
                      <td className="p-4 font-bold text-[var(--text-main)]">{ord.tableNumber || ord.tableId || 'Takeaway'}</td>
                      <td className="p-4 font-mono font-bold text-[var(--text-main)]">Rs. {ord.total.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{ord.paymentMethod || 'COD'} ({ord.paymentStatus})</td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{new Date(ord.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {adminTab === 'audit' && (
          <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="font-extrabold text-lg text-[var(--text-main)] font-display flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>Immutable System Audit Trail</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Records all staff logins, status changes, table QR updates, and administrative actions.</p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={auditFilterAction}
                  onChange={(e) => {
                    setAuditFilterAction(e.target.value);
                  }}
                  className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                >
                  <option value="">All Actions</option>
                  <option value="STAFF_LOGIN">Staff Login</option>
                  <option value="ORDER_STATUS_UPDATED">Order Status</option>
                  <option value="TABLE_QR_REGENERATED">QR Regenerated</option>
                  <option value="TABLE_CREATED">Table Created</option>
                  <option value="STAFF_ACCOUNT_CREATED">Staff Created</option>
                </select>
                <button
                  onClick={fetchAuditLogs}
                  className="p-2 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-bold tracking-wider text-[9px] bg-[var(--bg-color)]/60">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Staff User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity &amp; ID</th>
                    <th className="p-4">Details / Changes</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-color)]/20 transition-colors">
                      <td className="p-4 font-mono text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-bold text-[var(--text-main)]">{log.user?.name || log.user?.email || 'System'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{log.entity} #{log.entityId || '-'}</td>
                      <td className="p-4 text-[11px] text-[var(--text-muted)] max-w-xs truncate">
                        {log.newValue || log.oldValue || 'Action performed'}
                      </td>
                      <td className="p-4 font-mono text-[10px] text-[var(--text-muted)]">{log.ip || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD TABLE */}
        {showAddTableModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
                <h3 className="font-extrabold text-[var(--text-main)] text-base font-display">Add New Dining Table</h3>
                <button onClick={() => setShowAddTableModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">✕</button>
              </div>
              <form onSubmit={handleAddTableSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-main)] block mb-1">Table Number or Name</label>
                  <input
                    type="text"
                    required
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="e.g. Table 21 or Patio 2"
                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTableModal(false)}
                    className="py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Create Table
                  </button>
                </div>
              </form>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
