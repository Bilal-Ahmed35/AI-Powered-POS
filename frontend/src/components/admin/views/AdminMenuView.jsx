import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Clock,
  Tag,
  DollarSign,
  Package,
  X,
} from 'lucide-react';
import api from '../../../services/api';

const AdminMenuView = ({ inventory = [], onRefresh, showToast }) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fast Food',
    price: '',
    prepTime: '10',
    description: '',
    stock: '50',
    isAvailable: true,
  });

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.category || 'General'));
    return ['ALL', ...Array.from(cats)];
  }, [inventory]);

  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [inventory, selectedCategory, searchTerm]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Fast Food',
      price: '',
      prepTime: '10',
      description: '',
      stock: '50',
      isAvailable: true,
    });
    setShowItemModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'Fast Food',
      price: String(item.price || ''),
      prepTime: String(item.prepTime || '10'),
      description: item.description || '',
      stock: String(item.stock || '50'),
      isAvailable: item.isAvailable !== false,
    });
    setShowItemModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        prepTime: parseInt(formData.prepTime, 10) || 10,
        description: formData.description,
        stock: parseInt(formData.stock, 10) || 50,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, payload);
        if (showToast) showToast('Menu item updated successfully!');
      } else {
        await api.post('/menu', payload);
        if (showToast) showToast('New menu item created!');
      }

      setShowItemModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.response?.data?.error || 'Failed to save menu item', 'error');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item.id}`, {
        ...item,
        isAvailable: !item.isAvailable,
      });
      if (showToast) showToast(`"${item.name}" availability toggled!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to toggle availability', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-main)] font-display">Menu Catalog Management</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Control pricing, preparation times, categories, and customer availability.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Menu Item</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center overflow-x-auto p-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl gap-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search menu item name..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Menu Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-[var(--card-bg)]/40 border rounded-2xl p-5 space-y-4 shadow-lg transition-all ${
              item.isAvailable !== false ? 'border-[var(--border-color)]' : 'border-rose-500/30 opacity-70'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[9px] font-black uppercase tracking-wider">
                  {item.category || 'General'}
                </span>
                <h3 className="text-base font-extrabold text-[var(--text-main)] mt-1">{item.name}</h3>
              </div>
              <span className="text-base font-mono font-extrabold text-emerald-400">
                Rs. {item.price?.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] line-clamp-2 min-h-[32px]">
              {item.description || 'Freshly prepared daily with quality ingredients.'}
            </p>

            <div className="flex justify-between items-center text-xs pt-3 border-t border-[var(--border-color)] text-[var(--text-muted)]">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>~{item.prepTime || 10} mins</span>
              </span>
              <span className="flex items-center space-x-1">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Stock: {item.stock || 50}</span>
              </span>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleToggleAvailability(item)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer ${
                  item.isAvailable !== false
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                }`}
              >
                {item.isAvailable !== false ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Available</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Unavailable</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleOpenEdit(item)}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Item</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <h3 className="text-lg font-extrabold text-[var(--text-main)] font-display">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1.5 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chicken Biryani 250g"
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Fast Food"
                    className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="250.00"
                    className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short product description..."
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <label htmlFor="availCheck" className="font-bold text-[var(--text-main)] cursor-pointer">
                  Available for Customer Ordering
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuView;
