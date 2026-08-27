import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import {
  Menu,
  Sun,
  Moon,
  Search,
  Bell,
  Building2,
  User,
  Shield,
  RefreshCw,
} from 'lucide-react';

const titleMap = {
  dashboard: 'Executive Dashboard Overview',
  orders: 'Orders Management & Transactions',
  payments: 'Payment Monitoring & Verification',
  menu: 'Menu Catalog & Categories',
  inventory: 'Stock Inventory & Audit Logs',
  staff: 'Staff Account Management & Roles',
  customers: 'Customer Roster & Analytics',
  tables: 'Tables & Cryptographic QR Cards',
  kitchen: 'Kitchen Live Operations Monitor',
  'payment-availability': 'Payment Availability Controls',
  notifications: 'System Notifications & Alerts Center',
  'ai-insights': 'AI Demand Forecasts & Analytics',
  reports: 'Executive Reports & Analytics',
  'audit-logs': 'System Immutable Audit Logs',
  'order-history': 'Order Status Transition Timeline',
  branches: 'Branch Management & Outlets',
};

const AdminLayout = ({ activeTab, onSelectTab, user, onLogout, children, onRefresh }) => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [selectedBranch, setSelectedBranch] = useState('Main Campus Canteen');

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', collapsed);
  }, [collapsed]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    const root = window.document.documentElement;
    if (nextTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] flex font-sans transition-colors duration-300">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Header Bar */}
        <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border-color)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-colors duration-300">
          <div className="flex items-center space-x-3 truncate">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block">
                ADMIN PANEL • {activeTab.replace('-', ' ').toUpperCase()}
              </span>
              <h1 className="text-base font-extrabold text-[var(--text-main)] truncate font-display">
                {titleMap[activeTab] || 'Admin Management'}
              </h1>
            </div>
          </div>

          {/* Top Right Actions & Badges */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Branch Selector Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] font-bold">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-[var(--text-main)] focus:outline-none cursor-pointer font-bold"
              >
                <option value="Main Campus Canteen">Main Campus Canteen</option>
                <option value="Hostel Block Canteen">Hostel Block Canteen</option>
              </select>
            </div>

            {/* Refresh Data Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Refresh Page Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2 bg-[var(--bg-color)] border border-[var(--border-color)] px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-black block text-[var(--text-main)] leading-tight">{user?.name || 'Administrator'}</span>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
