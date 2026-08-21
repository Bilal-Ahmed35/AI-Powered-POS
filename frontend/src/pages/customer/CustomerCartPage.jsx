import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { getETAPrediction } from '../../services/etaService';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Clock,
  Bot,
  AlertCircle,
  CheckCircle2,
  Shield,
  CreditCard,
  Banknote,
  Utensils,
  Check,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';

const CustomerCartPage = ({ user }) => {
  const navigate = useNavigate();

  // ─── Persistent cart state ────────────────────────────────────────────────
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [tableId] = useState(() => localStorage.getItem('customer_tableId') || 'Table 4');
  const [error, setError] = useState('');

  // ─── ETA / Kitchen Load ───────────────────────────────────────────────────
  const [etaInfo, setEtaInfo] = useState(null);
  const [etaLoading, setEtaLoading] = useState(false);

  // ─── OTP / Guest details ─────────────────────────────────────────────────
  const [guestName, setGuestName] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.isGuest) return u.name;
      } catch {}
    }
    return '';
  });
  const [guestEmail, setGuestEmail] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.isGuest) return u.email;
      } catch {}
    }
    return '';
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        return !u.isGuest;
      } catch {}
    }
    return false;
  });
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ─── Payment / checkout ───────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState(
    () => localStorage.getItem('customer_paymentMethod') || 'COD'
  );
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [checkoutDone, setCheckoutDone] = useState(false);

  // ─── Persist cart ─────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('customer_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('customer_paymentMethod', paymentMethod);
  }, [paymentMethod]);

  // ─── Cooldown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  // ─── Fetch ETA whenever cart changes ─────────────────────────────────────
  useEffect(() => {
    const itemsList = Object.values(cart).map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
    }));
    if (itemsList.length > 0) {
      setEtaLoading(true);
      getETAPrediction(itemsList)
        .then(data => setEtaInfo(data))
        .catch(err => console.error('ETA error:', err))
        .finally(() => setEtaLoading(false));
    } else {
      setEtaInfo(null);
    }
  }, [cart]);

  // ─── Real-time order update via socket ───────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = updatedOrder => {
        setActiveOrder(prev => {
          if (!prev || prev.id === updatedOrder.id) {
            return updatedOrder;
          }
          return prev;
        });
      };
      socket.on('order:update', handleOrderUpdate);
      return () => socket.off('order:update', handleOrderUpdate);
    }
  }, []);

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = item => {
    setCart(prev => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  };

  const removeOneFromCart = itemId => {
    setCart(prev => {
      const copy = { ...prev };
      if (!copy[itemId]) return prev;
      if (copy[itemId].quantity <= 1) {
        delete copy[itemId];
      } else {
        copy[itemId] = { ...copy[itemId], quantity: copy[itemId].quantity - 1 };
      }
      return copy;
    });
  };

  const deleteFromCart = itemId => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const clearCart = () => setCart({});

  const getSubtotal = () =>
    Object.values(cart).reduce((t, item) => t + item.price * item.quantity, 0);

  const getTotal = () => getSubtotal().toFixed(2);

  const totalQty = Object.values(cart).reduce((s, i) => s + i.quantity, 0);

  // ─── Image helper (same logic as menu page) ───────────────────────────────
  const getItemImage = item => {
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    if (name.includes('biryani') || name.includes('rice') || name.includes('pulao'))
      return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80';
    if (name.includes('burger') || name.includes('zinger') || name.includes('patty'))
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80';
    if (name.includes('pizza') || name.includes('calzone'))
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80';
    if (name.includes('sandwich') || name.includes('club'))
      return 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&auto=format&fit=crop&q=80';
    if (name.includes('fries') || name.includes('chips'))
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80';
    if (name.includes('cake') || name.includes('brownie') || name.includes('chocolate') || name.includes('dessert'))
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80';
    if (name.includes('tea') || name.includes('chai') || name.includes('coffee') || name.includes('coke') || name.includes('drink') || cat.includes('beverage'))
      return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80';
    if (name.includes('naan') || name.includes('bread') || name.includes('roti'))
      return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=80';
  };

  // ─── OTP handlers ─────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!guestEmail || !guestName) {
      setError('Please enter your name and email first.');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email: guestEmail, name: guestName });
      if (response.data.success) {
        setOtpSent(true);
        setCooldown(30);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please check your email address.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter the verification code sent to your email.');
      return;
    }
    setError('');
    setOtpLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: guestEmail,
        name: guestName,
        otp: otpCode,
      });
      if (response.data.success) {
        setOtpVerified(true);
        if (response.data.accessToken) localStorage.setItem('token', response.data.accessToken);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          connectSocket(response.data.user);
        }
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Place order ─────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setError('');
    if (!otpVerified) {
      setError('Please verify your email via OTP before placing an order.');
      return;
    }
    const items = Object.values(cart).map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
    }));
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setPlacingOrder(true);
    try {
      const response = await api.post('/orders', {
        items,
        tableId,
        paymentMethod,
        customerEmail: guestEmail || user?.email,
        emailVerified: true,
      });
      const placedOrder = response.data.order;
      setActiveOrder(placedOrder);
      clearCart();
      setCheckoutDone(true);
      localStorage.setItem('customer_checkoutStep', 'tracking');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to place order. Please check stock levels.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // ─── Order status helper ──────────────────────────────────────────────────
  const getStatusStepIndex = status => {
    const steps = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];
    return steps.indexOf(status);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER – Order Tracking view after successful placement
  // ════════════════════════════════════════════════════════════════════════════
  if (checkoutDone && activeOrder) {
    return (
      <div className="w-full bg-[#FFFFFF] text-[#17172B] min-h-screen font-sans flex flex-col">
        {/* Header */}
        <header className="w-full bg-white border-b border-[#E8E8F0] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center space-x-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B3DF5] to-[#7C4DFF] flex items-center justify-center text-white shadow-md">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-[#17172B] leading-none">SWIPEBITE</h1>
            <span className="text-[9px] font-bold text-[#62627A] tracking-wider uppercase">Order Tracking</span>
          </div>
        </header>

        <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-8">
          <div className="bg-white border border-[#E8E8F0] p-8 rounded-3xl shadow-xl space-y-6 mt-4">
            <div className="flex justify-between items-start border-b border-[#E8E8F0] pb-4">
              <div>
                <span className="text-[10px] text-[#62627A] font-mono tracking-wider uppercase block">LIVE ORDER TRACKING</span>
                <h2 className="text-xl font-black text-[#17172B]">Order #000{activeOrder.id}</h2>
                <span className="text-xs text-[#5B3DF5] font-bold block mt-0.5">{activeOrder.tableId || tableId}</span>
              </div>
              <span className="px-3 py-1 bg-[#F3EFFF] text-[#5B3DF5] border border-[#5B3DF5]/20 text-xs font-extrabold rounded-xl font-mono">
                Rs. {activeOrder.total?.toFixed(2)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-[#17172B]">
                <span>Status: <strong className="text-[#5B3DF5] uppercase">{activeOrder.status}</strong></span>
                <span>{getStatusStepIndex(activeOrder.status) + 1} of 5 Steps</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                {['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'].map((st, idx) => (
                  <div
                    key={st}
                    className={`h-full flex-1 border-r last:border-0 border-white transition-all duration-500 ${
                      idx <= getStatusStepIndex(activeOrder.status) ? 'bg-[#5B3DF5]' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-[#62627A] font-mono mt-1">
                {['Pending', 'Paid', 'Preparing', 'Ready', 'Done'].map(s => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>

            {/* Status messages */}
            {['PENDING', 'PAID'].includes(activeOrder.status) && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Your order is confirmed and waiting to be prepared. Sit tight! 🍽️</span>
              </div>
            )}
            {activeOrder.status === 'PREPARING' && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 shrink-0 animate-spin" />
                <span>Your food is being prepared right now. Won't be long!</span>
              </div>
            )}
            {activeOrder.status === 'READY' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>🎉 Your order is READY! Please collect it from the counter.</span>
              </div>
            )}

            {/* Receipt */}
            <div className="p-4 bg-[#F3EFFF]/50 border border-[#5B3DF5]/15 rounded-2xl space-y-3 text-xs font-mono">
              <div className="border-b border-[#5B3DF5]/15 pb-2 text-center">
                <strong className="text-[#17172B] font-bold block text-sm">AI-POWERED POS RECEIPT</strong>
                <span className="text-[10px] text-[#62627A]">Customer: {activeOrder.customerEmail || guestEmail}</span>
              </div>
              <div className="space-y-1">
                {activeOrder.orderItems?.map(oi => (
                  <div key={oi.id} className="flex justify-between text-[#17172B]">
                    <span>{oi.menuItem?.name} × {oi.quantity}</span>
                    <span>Rs. {(oi.price * oi.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#5B3DF5]/15 pt-2 flex justify-between text-[#17172B] font-bold">
                <span>Total:</span>
                <span className="text-[#5B3DF5]">Rs. {activeOrder.total?.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/customer')}
              className="w-full py-3 bg-[#5B3DF5] hover:bg-[#4F46E5] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              ← Return to Menu
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER – Cart Page
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FFFFFF] text-[#17172B] min-h-screen font-sans flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-[#E8E8F0] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/customer')}
            className="p-2 bg-[#F3EFFF] text-[#5B3DF5] hover:bg-[#5B3DF5] hover:text-white rounded-xl transition-all cursor-pointer border border-[#5B3DF5]/20"
            title="Back to Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B3DF5] to-[#7C4DFF] flex items-center justify-center text-white shadow-md">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-[#17172B] leading-none">SWIPEBITE</h1>
              <span className="text-[9px] font-bold text-[#62627A] tracking-wider uppercase">Your Cart</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-[#E8E8F0] hidden sm:block" />
          <span className="font-black text-sm text-[#17172B]">{tableId}</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#17172B]">Hi, {guestName || user?.name || 'Customer'}</span>
            <span className="text-[10px] text-[#62627A] font-mono">{guestEmail || user?.email || ''}</span>
          </div>
          <div className="relative p-2.5 bg-[#F3EFFF] text-[#5B3DF5] rounded-xl border border-[#5B3DF5]/20">
            <ShoppingBag className="w-5 h-5" />
            {totalQty > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#5B3DF5] border-2 border-white text-white rounded-full text-[10px] font-black flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-semibold flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Page title */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17172B] flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-[#5B3DF5]" />
            <span>Your Cart ({totalQty} {totalQty === 1 ? 'item' : 'items'})</span>
          </h2>
          {totalQty > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* ── Empty cart state ─────────────────────────────────────────────── */}
        {totalQty === 0 ? (
          <div className="py-24 text-center bg-white border border-[#E8E8F0] rounded-3xl space-y-4">
            <span className="text-5xl block">🛒</span>
            <p className="font-bold text-base text-[#17172B]">Your cart is empty</p>
            <p className="text-xs text-[#62627A]">Browse the menu and add delicious items.</p>
            <button
              onClick={() => navigate('/customer')}
              className="mt-2 px-6 py-3 bg-[#5B3DF5] text-white rounded-xl text-xs font-bold hover:bg-[#4F46E5] transition-all shadow-md cursor-pointer inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Menu</span>
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6 items-start">

            {/* ── LEFT: Items + ETA ──────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Cart items list */}
              <div className="bg-white border border-[#E8E8F0] rounded-3xl shadow-sm overflow-hidden">
                <div className="divide-y divide-[#E8E8F0]">
                  {Object.values(cart).map(item => (
                    <div key={item.id} className="p-4 flex items-center space-x-4">
                      <img
                        src={getItemImage(item)}
                        alt={item.name}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-[#17172B] truncate">{item.name}</h3>
                        <span className="text-xs text-[#62627A] font-mono">Rs. {item.price} each</span>
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex items-center bg-[#F3EFFF] border border-[#5B3DF5]/20 p-1 rounded-xl">
                            <button
                              onClick={() => removeOneFromCart(item.id)}
                              className="w-6 h-6 rounded-lg bg-white border border-[#E8E8F0] text-[#17172B] hover:bg-red-500 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                            >
                              −
                            </button>
                            <span className="text-xs text-[#5B3DF5] font-black px-3 min-w-8 text-center font-mono">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item)}
                              disabled={item.stock <= item.quantity}
                              className="w-6 h-6 rounded-lg bg-[#5B3DF5] text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => deleteFromCart(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black font-mono text-[#17172B]">
                          Rs. {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ETA & Kitchen Load */}
              <div className="bg-white border border-[#E8E8F0] rounded-3xl shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-sm text-[#17172B] flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-[#5B3DF5]" />
                  <span>AI Kitchen Estimates</span>
                  {etaLoading && <span className="text-[10px] text-[#62627A] font-mono">(updating...)</span>}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F3EFFF] border border-[#5B3DF5]/20 rounded-2xl flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-[#62627A] font-mono uppercase block leading-none">Est. Delivery</span>
                      <strong className="text-sm font-black font-mono text-[#17172B] mt-0.5 block">
                        {etaInfo
                          ? `${Math.round(etaInfo.adjustedEta || 8)}–${Math.round((etaInfo.adjustedEta || 8) + 3)} min`
                          : '— min'}
                      </strong>
                    </div>
                  </div>
                  <div className="p-4 bg-[#F3EFFF] border border-[#5B3DF5]/20 rounded-2xl flex items-center space-x-3">
                    <Bot className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-[#62627A] font-mono uppercase block leading-none">Kitchen Load</span>
                      <strong className={`text-sm font-black font-mono mt-0.5 block ${
                        etaInfo?.kitchenLoad === 'High' ? 'text-red-500' :
                        etaInfo?.kitchenLoad === 'Medium' ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
                        {etaInfo?.kitchenLoad || '—'}
                      </strong>
                    </div>
                  </div>
                </div>
                {etaInfo?.kitchenLoad === 'High' && (
                  <p className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    ⚠️ Kitchen is currently busy. Your order may take a bit longer than usual.
                  </p>
                )}
              </div>

              {/* Back to menu link */}
              <button
                onClick={() => navigate('/customer')}
                className="text-xs font-bold text-[#5B3DF5] hover:underline cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Add more items</span>
              </button>
            </div>

            {/* ── RIGHT: OTP + Payment + Order summary ───────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Order Summary */}
              <div className="bg-white border border-[#E8E8F0] rounded-3xl shadow-sm p-5 space-y-3">
                <h3 className="font-bold text-sm text-[#17172B]">Order Summary</h3>
                <div className="space-y-2 text-xs">
                  {Object.values(cart).map(item => (
                    <div key={item.id} className="flex justify-between text-[#62627A]">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-mono">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#E8E8F0] pt-3 flex justify-between items-center">
                  <span className="font-bold text-sm text-[#17172B]">Grand Total</span>
                  <strong className="text-base font-black font-mono text-[#5B3DF5]">Rs. {getTotal()}</strong>
                </div>
                <div className="text-[10px] text-[#62627A] flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>No hidden charges • Prices are inclusive of all taxes</span>
                </div>
              </div>

              {/* OTP Verification */}
              <div className={`bg-white border rounded-3xl shadow-sm p-5 space-y-4 ${otpVerified ? 'border-emerald-200' : 'border-[#E8E8F0]'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#17172B]">Email Verification</h3>
                  {otpVerified && (
                    <span className="flex items-center space-x-1 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {otpVerified ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Email verified successfully! You can now select a payment method below.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-[#62627A]">
                      Verify your email to unlock payment methods and place your order.
                    </p>

                    {/* Name field */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#17172B]">Full Name</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white border border-[#E8E8F0] rounded-xl px-3 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#5B3DF5] transition-all"
                      />
                    </div>

                    {/* Email + Send OTP */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#17172B]">Email Address</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={e => setGuestEmail(e.target.value)}
                          placeholder="you@email.com"
                          disabled={otpSent}
                          className="flex-1 bg-white border border-[#E8E8F0] rounded-xl px-3 py-2.5 text-xs text-[#17172B] focus:outline-none focus:border-[#5B3DF5] disabled:bg-gray-50 transition-all"
                        />
                        <button
                          onClick={handleSendOTP}
                          disabled={otpLoading || cooldown > 0}
                          className="px-3 py-2.5 bg-[#5B3DF5] text-white rounded-xl text-xs font-bold hover:bg-[#4F46E5] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          {otpLoading ? 'Sending…' : cooldown > 0 ? `${cooldown}s` : otpSent ? 'Resend' : 'Send OTP'}
                        </button>
                      </div>
                    </div>

                    {/* OTP code input */}
                    {otpSent && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#17172B]">Enter OTP Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value)}
                            placeholder="6-digit code"
                            className="flex-1 bg-white border border-[#E8E8F0] rounded-xl px-3 py-2.5 text-center text-sm tracking-widest font-mono text-[#17172B] focus:outline-none focus:border-[#5B3DF5]"
                          />
                          <button
                            onClick={handleVerifyOTP}
                            disabled={otpLoading}
                            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                          >
                            {otpLoading ? 'Checking…' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className={`bg-white border rounded-3xl shadow-sm p-5 space-y-4 transition-all ${!otpVerified ? 'opacity-50 pointer-events-none select-none border-[#E8E8F0]' : 'border-[#5B3DF5]/30'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#17172B]">Payment Method</h3>
                  {!otpVerified && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>Verify email to unlock</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Cash on Delivery */}
                  <button
                    onClick={() => setPaymentMethod('COD')}
                    disabled={!otpVerified}
                    className={`w-full flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'COD'
                        ? 'border-[#5B3DF5] bg-[#F3EFFF]'
                        : 'border-[#E8E8F0] bg-white hover:border-[#5B3DF5]/40'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${paymentMethod === 'COD' ? 'bg-[#5B3DF5] text-white' : 'bg-gray-100 text-[#62627A]'}`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-[#17172B]">Cash on Delivery</p>
                      <p className="text-[10px] text-[#62627A]">Pay in cash when order is ready</p>
                    </div>
                    {paymentMethod === 'COD' && <Check className="w-4 h-4 text-[#5B3DF5]" />}
                  </button>

                  {/* Online Payment */}
                  <button
                    onClick={() => setPaymentMethod('Easypaisa')}
                    disabled={!otpVerified}
                    className={`w-full flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === 'Easypaisa'
                        ? 'border-[#5B3DF5] bg-[#F3EFFF]'
                        : 'border-[#E8E8F0] bg-white hover:border-[#5B3DF5]/40'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${paymentMethod === 'Easypaisa' ? 'bg-[#5B3DF5] text-white' : 'bg-gray-100 text-[#62627A]'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-[#17172B]">Online Payment</p>
                      <p className="text-[10px] text-[#62627A]">Easypaisa / JazzCash / Card</p>
                    </div>
                    {paymentMethod === 'Easypaisa' && <Check className="w-4 h-4 text-[#5B3DF5]" />}
                  </button>
                </div>
              </div>

              {/* Place Order button */}
              <button
                onClick={handlePlaceOrder}
                disabled={!otpVerified || placingOrder || totalQty === 0}
                className="w-full py-4 bg-[#5B3DF5] hover:bg-[#4F46E5] disabled:bg-gray-200 disabled:text-gray-400 disabled:pointer-events-none text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-[#5B3DF5]/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                {placingOrder ? (
                  <span>Placing Order…</span>
                ) : (
                  <>
                    <span>Place Order · Rs. {getTotal()}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {!otpVerified && (
                <p className="text-center text-[11px] text-[#62627A]">
                  🔒 Verify your email to enable the Place Order button.
                </p>
              )}

              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-[#62627A]">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured checkout • Your data is safe with us</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerCartPage;
