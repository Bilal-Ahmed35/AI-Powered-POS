import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { ChefHat, Play, CheckCircle, RefreshCw, Flame, Clock, AlertCircle } from 'lucide-react';

const KitchenDashboard = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const alertTimerRef = useRef(null);

  // Simple synthesised beep to wow the user for kitchen notifications!
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('AudioContext not allowed or supported yet:', e);
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    const socket = getSocket();
    if (socket) {
      const handleOrderNew = (newOrder) => {
        console.log('Kitchen received new order:', newOrder);
        if (newOrder.status === 'PAID') {
          playNotificationSound();
          setNewOrderAlert(true);
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === newOrder.id);
            if (exists) return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
            return [newOrder, ...prev];
          });

          if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
          alertTimerRef.current = setTimeout(() => setNewOrderAlert(false), 5000);
        }
      };

      const handleOrderUpdate = (updatedOrder) => {
        console.log('Kitchen received order update:', updatedOrder);
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updatedOrder.id);
          if (exists) {
            if (['COMPLETED', 'CANCELLED'].includes(updatedOrder.status)) {
              return prev.filter((o) => o.id !== updatedOrder.id);
            }
            return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          } else if (['PAID', 'PREPARING', 'READY'].includes(updatedOrder.status)) {
            return [updatedOrder, ...prev];
          }
          return prev;
        });
      };

      socket.on('order:new', handleOrderNew);
      socket.on('order:update', handleOrderUpdate);

      return () => {
        socket.off('order:new', handleOrderNew);
        socket.off('order:update', handleOrderUpdate);
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      };
    }
  }, []);

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      // Kitchen is interested in: PAID, PREPARING, READY
      const active = response.data.orders.filter((o) => ['PAID', 'PREPARING', 'READY'].includes(o.status));
      setOrders(active);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      // Status update will trigger socket update, but we update locally to keep UI instant
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update order status.');
    }
  };

  const getElapsedTime = (createdAtStr) => {
    const created = new Date(createdAtStr);
    const diffMs = new Date() - created;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins}m ago`;
  };

  // Filter orders by queue columns
  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const formatTableDisplay = (tId) => {
    if (!tId) return 'Takeaway';
    const s = String(tId);
    return s.toLowerCase().startsWith('table') ? s : `Table ${s}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] p-6 flex flex-col space-y-6 relative overflow-hidden transition-colors duration-300">
      {/* Background neon flares */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/3 rounded-full blur-[140px] pointer-events-none" />

      {/* Visual flash alert for new orders */}
      {newOrderAlert && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-550 text-black py-4 px-6 rounded-2xl flex justify-between items-center font-bold text-sm shadow-xl shadow-amber-500/10 animate-bounce relative z-50 border border-amber-400/20">
          <div className="flex items-center space-x-3">
            <Flame className="w-5 h-5 animate-pulse text-black" />
            <span className="tracking-tight uppercase">Incoming order alert: A new order has been sent to the board!</span>
          </div>
          <button onClick={() => setNewOrderAlert(false)} className="text-black/60 hover:text-black transition-colors cursor-pointer font-bold px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] p-6 rounded-2xl shadow-xl transition-colors duration-300 mb-8 relative z-10 animate-fade-in">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl shadow-inner">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md text-[10px] font-extrabold tracking-wider uppercase">
                Kitchen KDS Board
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[var(--text-main)] mt-1.5 font-display tracking-tight">Canteen Preparation Queue</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={fetchActiveOrders}
            className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--bg-color)]/65 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl transition-all cursor-pointer"
            title="Refresh Queue Board"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="px-5 py-2.5 bg-gradient-to-r from-red-650 to-rose-650 hover:from-red-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/20 cursor-pointer transition-all border border-red-500/10"
          >
            Log Out
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-2.5 animate-glow-pulse relative z-10 mb-6">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid columns */}
      <div className="flex-1 grid md:grid-cols-3 gap-6 overflow-hidden min-h-[500px] relative z-10">
        {/* Column 1: Incoming / PAID */}
        <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-5 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <h3 className="font-extrabold text-[var(--text-main)] text-xs tracking-wider uppercase font-display">Incoming Paid</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full font-extrabold border border-blue-500/20 font-mono">
              {paidOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
            {paidOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs py-12 text-center">
                <span className="text-2xl mb-1.5 opacity-55">💤</span>
                <p className="font-semibold text-[var(--text-muted)]">Order queue is empty</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Paid transactions appear here automatically.</p>
              </div>
            ) : (
              paidOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-blue-500/30 rounded-xl p-4.5 space-y-4 hover:shadow-xl transition-all duration-300 animate-fade-in"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-[var(--text-main)] text-sm font-mono">#000{order.id}</h4>
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5 block">Placement: {formatTableDisplay(order.tableId)}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center space-x-1 font-mono bg-[var(--bg-color)]/50 px-2 py-0.5 rounded border border-[var(--border-color)]">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>{getElapsedTime(order.createdAt)}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] space-y-2.5">
                    {order.orderItems?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs font-semibold text-[var(--text-main)] items-center">
                        <span className="truncate max-w-[150px]">{item.menuItem?.name}</span>
                        <span className="text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded text-[10px] border border-amber-500/10">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all border border-blue-500/20 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Preparation</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Cooking / PREPARING */}
        <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-5 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
              <h3 className="font-extrabold text-[var(--text-main)] text-xs tracking-wider uppercase font-display">In Preparation</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded-full font-extrabold border border-purple-500/20 font-mono">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs py-12 text-center">
                <span className="text-2xl mb-1.5 opacity-55">🍳</span>
                <p className="font-semibold text-[var(--text-muted)]">Nothing cooking right now</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Chef click "Start Cooking" to begin orders.</p>
              </div>
            ) : (
              preparingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[var(--card-bg)] border border-purple-500/15 rounded-xl p-4.5 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.02)] hover:border-purple-500/35 hover:shadow-[0_0_25px_rgba(168,85,247,0.05)] transition-all duration-300 animate-fade-in"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-[var(--text-main)] text-sm font-mono">#000{order.id}</h4>
                      <span className="text-[10px] text-purple-400 font-semibold mt-0.5 block">Placement: {formatTableDisplay(order.tableId)}</span>
                    </div>
                    <span className="text-[10px] text-purple-400 flex items-center space-x-1 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 animate-glow-pulse">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
                      <span>{getElapsedTime(order.createdAt)}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] space-y-2.5">
                    {order.orderItems?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs font-semibold text-[var(--text-main)] items-center">
                        <span className="truncate max-w-[150px]">{item.menuItem?.name}</span>
                        <span className="text-purple-400 font-bold bg-purple-500/5 px-2 py-0.5 rounded text-[10px] border border-purple-500/10">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(order.id, 'READY')}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-650 to-indigo-650 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all border border-purple-500/20 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Complete Cooking</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready / READY */}
        <div className="bg-[var(--card-bg)]/40 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-5 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <h3 className="font-extrabold text-[var(--text-main)] text-xs tracking-wider uppercase font-display">Ready for Counter</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full font-extrabold border border-emerald-500/20 font-mono">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
            {readyOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-xs py-12 text-center">
                <span className="text-2xl mb-1.5 opacity-55">🛎️</span>
                <p className="font-semibold text-[var(--text-muted)]">No pickup items ready</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Finished meals will wait here for counter pickup.</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[var(--card-bg)] border border-emerald-500/15 rounded-xl p-4.5 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.01)] hover:border-emerald-500/35 hover:shadow-[0_0_25px_rgba(16,185,129,0.05)] transition-all duration-300 animate-fade-in"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-[var(--text-main)] text-sm font-mono">#000{order.id}</h4>
                      <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">Placement: {formatTableDisplay(order.tableId)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] space-y-2">
                    {order.orderItems?.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs text-[var(--text-muted)] items-center">
                        <span className="truncate max-w-[155px]">{item.menuItem?.name}</span>
                        <span className="text-[var(--text-muted)] font-medium">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-center rounded-lg text-[9px] font-extrabold uppercase tracking-wide">
                    Waiting for cashier handoff
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDashboard;
