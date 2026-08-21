import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  AlertCircle,
  Sparkles,
  ShoppingBag as CartIcon,
  Search,
  SlidersHorizontal,
  Heart,
  Star,
  Shield,
  Utensils,
  Truck,
  Bot,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import FAQModal from './FAQModal';

const CustomerDashboard = ({ user, onLogout, tableIdFromRoute }) => {
  const navigate = useNavigate();

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('customer_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [tableId, setTableId] = useState(() => localStorage.getItem('customer_tableId') || 'Table 4');
  const [tableError, setTableError] = useState('');
  const [category, setCategory] = useState(() => localStorage.getItem('customer_category') || 'All');
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState({});
  const [showFAQ, setShowFAQ] = useState(false);
  const [error, setError] = useState('');

  // Scan time calculation for top header
  const [scanTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Guest name/email (shown in header)
  const [guestName] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.isGuest) return u.name;
      } catch {}
    }
    return '';
  });
  const [guestEmail] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (!u.isGuest) return u.email;
      } catch {}
    }
    return '';
  });

  // ─── QR Table ID detection ────────────────────────────────────────────────
  useEffect(() => {
    if (tableIdFromRoute !== undefined && tableIdFromRoute !== null) {
      const clean = String(tableIdFromRoute).trim();
      let numStr = clean;
      if (clean.toLowerCase().startsWith('table')) {
        numStr = clean.substring(5).replace(/[^0-9]/g, '');
      } else {
        numStr = clean.replace(/[^0-9]/g, '');
      }
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 50) {
        const formatted = `Table ${num}`;
        setTableId(formatted);
        localStorage.setItem('customer_tableId', formatted);
        setTableError('');
      } else {
        setTableError('Invalid table QR code. Please scan the QR code available on your table.');
      }
    }
  }, [tableIdFromRoute]);

  // ─── Image helper ─────────────────────────────────────────────────────────
  const getItemImage = (item) => {
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    if (name.includes('biryani') || name.includes('rice') || name.includes('pulao'))
      return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80';
    if (name.includes('burger') || name.includes('zinger') || name.includes('patty'))
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=80';
    if (name.includes('pizza') || name.includes('calzone'))
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=80';
    if (name.includes('sandwich') || name.includes('club'))
      return 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=700&auto=format&fit=crop&q=80';
    if (name.includes('fries') || name.includes('chips'))
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700&auto=format&fit=crop&q=80';
    if (name.includes('cake') || name.includes('brownie') || name.includes('chocolate') || name.includes('dessert'))
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=700&auto=format&fit=crop&q=80';
    if (name.includes('tea') || name.includes('chai') || name.includes('coffee') || name.includes('coke') || name.includes('drink') || cat.includes('beverage'))
      return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=700&auto=format&fit=crop&q=80';
    if (name.includes('naan') || name.includes('bread') || name.includes('roti'))
      return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=700&auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&auto=format&fit=crop&q=80';
  };

  // ─── Checkout / tracking state ────────────────────────────────────────────
  const [checkoutStep, setCheckoutStep] = useState(
    () => localStorage.getItem('customer_checkoutStep') || 'menu'
  );

  // ─── Persist state ────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('customer_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('customer_tableId', tableId); }, [tableId]);
  useEffect(() => { localStorage.setItem('customer_category', category); }, [category]);
  useEffect(() => { localStorage.setItem('customer_checkoutStep', checkoutStep); }, [checkoutStep]);

  // ─── URL query param tableId ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('tableId') || params.get('table');
    if (tId) {
      setTableId(tId);
      localStorage.setItem('customer_tableId', tId);
    }
  }, []);

  // ─── Socket + menu + order init ───────────────────────────────────────────
  useEffect(() => {
    fetchMenu();
    checkForExistingOrder();

    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (updatedOrder) => {
        console.log('Customer received order update:', updatedOrder);
        setActiveOrder((prev) => {
          if (!prev || prev.id === updatedOrder.id || (user && updatedOrder.userId === user.id)) {
            if (['COMPLETED', 'CANCELLED'].includes(updatedOrder.status)) {
              return null;
            }
            return updatedOrder;
          }
          return prev;
        });
      };
      const handleMenuUpdate = () => fetchMenu();

      socket.on('order:update', handleOrderUpdate);
      socket.on('menu:update', handleMenuUpdate);
      socket.on('inventory:update', handleMenuUpdate);

      return () => {
        socket.off('order:update', handleOrderUpdate);
        socket.off('menu:update', handleMenuUpdate);
        socket.off('inventory:update', handleMenuUpdate);
      };
    }
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu');
      const items = response.data.items || [];
      setMenu(items);

      setCart((prevCart) => {
        const updatedCart = {};
        let changed = false;
        Object.keys(prevCart).forEach((itemId) => {
          const menuItem = items.find((i) => i.id === parseInt(itemId));
          if (menuItem && menuItem.isActive && menuItem.stock > 0) {
            updatedCart[itemId] = {
              ...prevCart[itemId],
              price: menuItem.price,
              description: menuItem.description,
              category: menuItem.category,
              stock: menuItem.stock,
            };
          } else {
            changed = true;
          }
        });
        if (changed) localStorage.setItem('customer_cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
    } catch (err) {
      console.error('Fetch menu failed:', err);
    }
  };

  const checkForExistingOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setActiveOrder(null); return; }
    try {
      const response = await api.get('/orders');
      const orders = response.data.orders;
      const unfinished = orders.find(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
      if (unfinished) {
        setActiveOrder(unfinished);
        setCheckoutStep('tracking');
      } else {
        setActiveOrder(null);
        const currentStep = localStorage.getItem('customer_checkoutStep');
        if (currentStep === 'tracking' || currentStep === 'payment_input') {
          setCheckoutStep('menu');
        }
      }
    } catch (err) {
      console.error('Check orders failed:', err);
    }
  };

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (!copy[itemId]) return prev;
      if (copy[itemId].quantity <= 1) {
        delete copy[itemId];
      } else {
        copy[itemId].quantity -= 1;
      }
      return copy;
    });
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCartQuantity = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  // ─── Order tracking helpers ───────────────────────────────────────────────
  const getStatusStepIndex = (status) => {
    const steps = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];
    return steps.indexOf(status);
  };

  // ─── Category / filter ────────────────────────────────────────────────────
  const categoryIcons = {
    'All': '🍲', 'Lunch': '🍱', 'Breakfast': '🍳',
    'Snacks': '🍟', 'Beverages': '🥤', 'Desserts': '🍩', 'Combos': '🍱',
  };
  const availableCategories = ['All', 'Lunch', 'Breakfast', 'Snacks', 'Beverages', 'Desserts', 'Combos'];
  const menuCategories = ['All', ...new Set(menu.map(item => item.category).filter(Boolean))];
  const combinedCategories = [...new Set([...availableCategories, ...menuCategories])];

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Hero food image
  const heroFoodItem = menu.find(i => (i.name || '').toLowerCase().includes('biryani')) || menu[0];
  const heroFoodImage = heroFoodItem
    ? getItemImage(heroFoodItem)
    : 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80';

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FFFFFF] text-[#17172B] min-h-screen font-sans flex flex-col relative selection:bg-indigo-100">

      {/* FAQ Modal */}
      {showFAQ && <FAQModal onClose={() => setShowFAQ(false)} />}

      {/* ── HEADER (single, kept as-is) ─────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-[#E8E8F0] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        
        {/* Left: Branding + Table context */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B3DF5] to-[#7C4DFF] flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-[#17172B] leading-none">SWIPEBITE</h1>
              <span className="text-[9px] font-bold text-[#62627A] tracking-wider uppercase block mt-0.5">CANTEEN ORDERING KIOSK</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#E8E8F0] hidden sm:block" />

          {/* Table & Scan Time */}
          <div className="flex items-center space-x-3">
            <h2 className="font-black text-sm text-[#17172B]">{tableError ? 'Invalid Table' : tableId}</h2>
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 bg-[#F3EFFF] text-[#5B3DF5] rounded-full text-[11px] font-bold border border-[#5B3DF5]/15">
              <Clock className="w-3 h-3 text-[#5B3DF5]" />
              <span>Scan Time: {scanTime}</span>
            </span>
          </div>
        </div>

        {/* Right: User info + Cart button */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#17172B]">
              Hi, {guestName || user?.name || 'Customer'}
            </span>
            <span className="text-[10px] text-[#62627A] font-mono">
              {guestEmail || user?.email || 'guest@canteen.edu'}
            </span>
          </div>

          {/* Cart button → navigates to /customer/cart */}
          <button
            onClick={() => navigate('/customer/cart')}
            className="p-2.5 bg-[#F3EFFF] text-[#5B3DF5] hover:bg-[#5B3DF5] hover:text-white rounded-xl relative transition-all duration-200 cursor-pointer border border-[#5B3DF5]/20 shadow-sm"
            title="View Cart"
          >
            <CartIcon className="w-5 h-5" />
            {totalCartQuantity > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#5B3DF5] border-2 border-white text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {totalCartQuantity}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Table QR Error */}
        {tableError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{tableError}</span>
          </div>
        )}

        {/* System Error */}
        {error && !tableError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Order Banner */}
        {activeOrder && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex justify-between items-center text-xs shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <strong className="text-emerald-700 font-bold block">Active Order #000{activeOrder.id} in Progress</strong>
                <span className="text-[#62627A]">Status: {activeOrder.status} • {activeOrder.tableId}</span>
              </div>
            </div>
            <button
              onClick={() => setCheckoutStep('tracking')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              Track Order →
            </button>
          </div>
        )}

        {/* ── MENU VIEW ──────────────────────────────────────────────────────── */}
        {checkoutStep === 'menu' && (
          <>
            {/* HERO BANNER (no ETA pills) */}
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#5B3DF5] via-[#6366F1] to-[#7C4DFF] text-white p-6 sm:p-10 shadow-xl shadow-indigo-500/10 border border-indigo-400/20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid md:grid-cols-12 items-center gap-6 relative z-10">
                {/* Left content */}
                <div className="md:col-span-7 space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] font-extrabold tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Fresh &amp; Smart Canteen</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                    Good food.<br />Great mood. ✨
                  </h1>

                  <p className="text-xs sm:text-sm text-indigo-100 max-w-md leading-relaxed">
                    Freshly prepared. Just for you.<br />
                    <span className="text-indigo-200 font-medium text-[11px]">AI powered kitchen • Faster service</span>
                  </p>

                  <button
                    onClick={() => navigate('/customer/cart')}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-[#5B3DF5] font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>View Cart {totalCartQuantity > 0 ? `(${totalCartQuantity})` : ''}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right: hero image */}
                <div className="md:col-span-5 relative flex justify-center items-center">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl transition-transform duration-500 hover:scale-105">
                    <img
                      src={heroFoodImage}
                      alt="Featured Food"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Floating Rating Tag */}
                  <div className="absolute top-2 right-2 sm:right-6 bg-white text-[#17172B] px-3.5 py-2 rounded-2xl shadow-xl flex items-center space-x-2 border border-[#E8E8F0] animate-bounce">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <div>
                      <strong className="text-xs font-black block leading-none">4.9 ⭐</strong>
                      <span className="text-[9px] text-[#62627A] font-semibold">100+ reviews</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Categories */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for food, beverages, snacks..."
                    className="w-full bg-white border border-[#E8E8F0] rounded-2xl px-4 py-3.5 pl-11 text-xs text-[#17172B] placeholder-[#62627A] focus:outline-none focus:border-[#5B3DF5] focus:ring-4 focus:ring-[#5B3DF5]/10 transition-all shadow-sm"
                  />
                  <Search className="w-4 h-4 text-[#62627A] absolute left-4 top-4" />
                </div>
                <button className="p-3.5 bg-white border border-[#E8E8F0] hover:border-[#5B3DF5] text-[#17172B] rounded-2xl transition-all cursor-pointer shadow-sm">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none select-none">
                {combinedCategories.map((cat) => {
                  const isActive = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex items-center space-x-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-[#F3EFFF] border-[#5B3DF5] text-[#5B3DF5] shadow-sm'
                          : 'bg-white border-[#E8E8F0] text-[#62627A] hover:text-[#17172B] hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base">{categoryIcons[cat] || '🍽️'}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu grid (full width now, no sidebar) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-[#17172B] flex items-center space-x-2">
                  <span>🔥</span>
                  <span>Popular Dishes</span>
                </h2>
                <span className="text-xs font-bold text-[#5B3DF5] hover:underline cursor-pointer">View All →</span>
              </div>

              {filteredMenu.length === 0 ? (
                <div className="py-16 text-center bg-white border border-[#E8E8F0] rounded-3xl p-8 text-[#62627A] space-y-2">
                  <span className="text-3xl block">🍽️</span>
                  <p className="font-bold text-sm text-[#17172B]">No dishes match your search criteria</p>
                  <p className="text-xs text-[#62627A]">Try clearing filters or searching for something else.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredMenu.map((item, idx) => {
                    const itemQuantity = cart[item.id]?.quantity || 0;
                    const isBestseller = idx % 2 === 0;

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-[#E8E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 hover:border-[#5B3DF5]/30 transition-all duration-300 flex flex-col justify-between group"
                      >
                        {/* Image */}
                        <div className="h-44 relative bg-gray-100 overflow-hidden select-none">
                          <img
                            src={getItemImage(item)}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            <span className={`px-2.5 py-1 text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wider shadow-sm ${isBestseller ? 'bg-[#5B3DF5]' : 'bg-emerald-600'}`}>
                              {isBestseller ? 'Bestseller' : 'Popular'}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full text-[#17172B] hover:text-red-500 transition-colors shadow-sm cursor-pointer"
                          >
                            <Heart className={`w-3.5 h-3.5 ${favorites[item.id] ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-sm text-[#17172B] line-clamp-1 group-hover:text-[#5B3DF5] transition-colors">{item.name}</h3>
                            <p className="text-xs text-[#62627A] line-clamp-2 leading-relaxed">{item.description || 'Fresh and hot canteen selection.'}</p>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#E8E8F0] pt-3">
                            <span className="text-base font-black font-mono text-[#17172B]">Rs. {item.price}</span>

                            {itemQuantity > 0 ? (
                              <div className="flex items-center bg-[#F3EFFF] border border-[#5B3DF5]/20 p-1 rounded-xl shadow-inner select-none">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-6 h-6 rounded-lg bg-white border border-[#E8E8F0] text-[#17172B] hover:bg-red-500 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                                >
                                  -
                                </button>
                                <span className="text-xs text-[#5B3DF5] font-black px-2.5 min-w-6 text-center font-mono">
                                  {itemQuantity}
                                </span>
                                <button
                                  onClick={() => addToCart(item)}
                                  disabled={item.stock <= itemQuantity}
                                  className="w-6 h-6 rounded-lg bg-[#5B3DF5] text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                disabled={item.stock === 0}
                                className="px-4 py-2 bg-[#5B3DF5] hover:bg-[#4F46E5] disabled:bg-gray-200 disabled:text-gray-400 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                              >
                                {item.stock === 0 ? 'Out of Stock' : '+ Add'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Promotional Combo Banner */}
            <div className="bg-[#F3EFFF] border border-[#5B3DF5]/15 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden shadow-sm">
              <div className="space-y-2 max-w-sm relative z-10">
                <span className="px-2.5 py-0.5 bg-[#5B3DF5] text-white text-[9px] font-black uppercase tracking-wider rounded-md">Combo Savings</span>
                <h3 className="text-xl font-black text-[#17172B]">Make it a combo!</h3>
                <p className="text-xs text-[#62627A]">Add a drink &amp; get flat 10% OFF on your complete lunch meal.</p>
                <button
                  onClick={() => setCategory('Combos')}
                  className="mt-2 px-4 py-2 bg-[#5B3DF5] text-white text-xs font-bold rounded-xl hover:bg-[#4F46E5] transition-all shadow-sm cursor-pointer"
                >
                  View Combos →
                </button>
              </div>
              <div className="relative w-48 h-32 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80"
                  alt="Combo Meal"
                  className="w-full h-full object-cover rounded-2xl shadow-md"
                />
                <span className="absolute -top-2 -right-2 bg-amber-400 text-[#17172B] text-[10px] font-black px-2.5 py-1 rounded-full shadow-md animate-bounce">
                  10% OFF
                </span>
              </div>
            </div>

            {/* Service Feature Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Utensils className="w-4 h-4" />, color: 'bg-purple-50 text-[#5B3DF5]', label: 'Hygienic Food', sub: 'Best ingredients' },
                { icon: <Truck className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-600', label: 'Fast Delivery', sub: 'To your table' },
                { icon: <Shield className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600', label: 'Secure Payment', sub: '100% safe checkout' },
                { icon: <Bot className="w-4 h-4" />, color: 'bg-amber-50 text-amber-600', label: 'AI Powered', sub: 'Smart estimates' },
              ].map(f => (
                <div key={f.label} className="p-4 bg-white border border-[#E8E8F0] rounded-2xl flex items-center space-x-3 shadow-sm">
                  <div className={`p-2 ${f.color} rounded-xl`}>{f.icon}</div>
                  <div>
                    <h4 className="text-xs font-bold text-[#17172B]">{f.label}</h4>
                    <p className="text-[10px] text-[#62627A]">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ORDER TRACKING STEP ───────────────────────────────────────────── */}
        {checkoutStep === 'tracking' && activeOrder && (
          <div className="max-w-xl mx-auto bg-white border border-[#E8E8F0] p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex justify-between items-start border-b border-[#E8E8F0] pb-4">
              <div>
                <span className="text-[10px] text-[#62627A] font-mono tracking-wider uppercase block">LIVE ORDER TRACKING</span>
                <h2 className="text-xl font-black text-[#17172B]">Order #000{activeOrder.id}</h2>
                <span className="text-xs text-[#5B3DF5] font-bold block mt-0.5">{activeOrder.tableId || 'Takeaway'}</span>
              </div>
              <span className="px-3 py-1 bg-[#F3EFFF] text-[#5B3DF5] border border-[#5B3DF5]/20 text-xs font-extrabold rounded-xl font-mono">
                Rs. {activeOrder.total?.toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-[#17172B]">
                <span>Status: <strong className="text-[#5B3DF5] uppercase">{activeOrder.status}</strong></span>
                <span>{getStatusStepIndex(activeOrder.status) + 1} of 5 Steps</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                {['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'].map((st, idx) => (
                  <div
                    key={st}
                    className={`h-full flex-1 border-r last:border-0 border-white transition-all duration-500 ${idx <= getStatusStepIndex(activeOrder.status) ? 'bg-[#5B3DF5]' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-[#62627A] font-mono">
                {['Pending', 'Paid', 'Preparing', 'Ready', 'Done'].map(s => <span key={s}>{s}</span>)}
              </div>
            </div>

            {activeOrder.status === 'READY' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>🎉 Your order is READY! Please collect it from the counter.</span>
              </div>
            )}
            {activeOrder.status === 'PREPARING' && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 shrink-0 animate-spin" />
                <span>Your food is being prepared. Won't be long!</span>
              </div>
            )}

            {/* Receipt */}
            <div className="p-4 bg-[#F3EFFF]/50 border border-[#5B3DF5]/15 rounded-2xl space-y-3 text-xs font-mono">
              <div className="border-b border-[#5B3DF5]/15 pb-2 text-center">
                <strong className="text-[#17172B] font-bold block text-sm">AI-POWERED POS RECEIPT</strong>
                <span className="text-[10px] text-[#62627A]">Customer: {activeOrder.customerEmail || guestEmail || 'Verified'}</span>
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
                <span>Total Amount:</span>
                <span className="text-[#5B3DF5]">Rs. {activeOrder.total?.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setCheckoutStep('menu')}
              className="w-full py-3 bg-[#5B3DF5] hover:bg-[#4F46E5] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Return to Menu Ordering
            </button>
          </div>
        )}
      </main>

      {/* ── Floating Help → FAQ button ──────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowFAQ(true)}
          className="px-5 py-3 bg-[#5B3DF5] hover:bg-[#4F46E5] text-white font-bold text-xs rounded-full shadow-2xl transition-all cursor-pointer flex items-center space-x-2 border-2 border-white"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </div>

    </div>
  );
};

export default CustomerDashboard;
