import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  X,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import api from '../../../services/api';

const AdminMenuView = ({ inventory = [], onRefresh, showToast }) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fast Food',
    price: '',
    prepTime: '10',
    description: '',
    stock: '50',
    isAvailable: true,
    imageUrl: null,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [pendingBase64, setPendingBase64] = useState(null);
  const [imageError, setImageError] = useState('');

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
      imageUrl: null,
    });
    setImagePreview(null);
    setPendingBase64(null);
    setImageError('');
    setShowItemModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'Fast Food',
      price: String(item.price ?? ''),
      prepTime: String(item.prepTime ?? '10'),
      description: item.description || '',
      stock: String(item.stock ?? '50'),
      isAvailable: item.isAvailable !== false && item.isActive !== false,
      imageUrl: item.imageUrl || null,
    });
    setImagePreview(item.imageUrl || null);
    setPendingBase64(null);
    setImageError('');
    setShowItemModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError('');

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      const msg = 'Invalid file format. Only JPG, JPEG, PNG, and WEBP formats are supported.';
      setImageError(msg);
      if (showToast) showToast(msg, 'error');
      return;
    }

    // Validate max size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      const msg = 'File size exceeds maximum allowed limit of 5MB.';
      setImageError(msg);
      if (showToast) showToast(msg, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPendingBase64(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPendingBase64(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl = formData.imageUrl;

      // If user selected a new file, upload to server first
      if (pendingBase64) {
        const uploadRes = await api.post('/menu/upload-image', {
          imageBase64: pendingBase64,
        });
        finalImageUrl = uploadRes.data.imageUrl;
      }

      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: parseFloat(formData.price),
        prepTime: parseInt(formData.prepTime, 10) || 10,
        description: formData.description?.trim() || null,
        stock: parseInt(formData.stock, 10) || 50,
        isActive: formData.isAvailable,
        imageUrl: finalImageUrl || null,
      };

      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, payload);
        if (showToast) showToast(`"${payload.name}" updated successfully!`);
      } else {
        await api.post('/menu', payload);
        if (showToast) showToast(`"${payload.name}" created successfully!`);
      }

      setShowItemModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save menu item error:', err);
      if (showToast) showToast(err.response?.data?.error || 'Failed to save menu item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const nextState = !(item.isAvailable !== false && item.isActive !== false);
      await api.put(`/menu/${item.id}`, {
        isActive: nextState,
      });
      if (showToast) showToast(`"${item.name}" availability updated to ${nextState ? 'Available' : 'Unavailable'}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to update availability', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.delete(`/menu/${deleteConfirmItem.id}`);
      if (showToast) showToast(`Menu item "${deleteConfirmItem.name}" deleted successfully!`);
      setDeleteConfirmItem(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete menu item error:', err);
      if (showToast) showToast(err.response?.data?.error || 'Failed to delete menu item.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-main)] font-display">Menu Catalog Management</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Control pricing, dish images, preparation times, categories, and customer availability.</p>
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
        {filteredItems.map((item) => {
          const isItemActive = item.isAvailable !== false && item.isActive !== false;

          return (
            <div
              key={item.id}
              className={`bg-[var(--card-bg)]/40 border rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between transition-all ${
                isItemActive ? 'border-[var(--border-color)]' : 'border-rose-500/30 opacity-70'
              }`}
            >
              <div className="space-y-3">
                {/* Image Preview Container */}
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 border border-[var(--border-color)]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-slate-100 text-xs font-bold space-x-1.5">
                      <ImageIcon className="w-4 h-4 opacity-50" />
                      <span>Fallback Image System</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white rounded text-[9px] font-black uppercase tracking-wider">
                    {item.category || 'General'}
                  </span>
                </div>

                <div className="flex justify-between items-start pt-1">
                  <h3 className="text-base font-extrabold text-[var(--text-main)]">{item.name}</h3>
                  <span className="text-base font-mono font-extrabold text-emerald-400">
                    Rs. {item.price?.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)] line-clamp-2 min-h-[32px]">
                  {item.description || 'Freshly prepared daily with quality ingredients.'}
                </p>

                <div className="flex justify-between items-center text-xs pt-2 border-t border-[var(--border-color)] text-[var(--text-muted)]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>~{item.prepTime || 10} mins</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Stock: {item.stock || 50}</span>
                  </span>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center space-x-1 cursor-pointer ${
                    isItemActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  {isItemActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Available</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Disabled</span>
                    </>
                  )}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmItem(item)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
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
              {/* IMAGE MANAGEMENT SECTION */}
              <div className="space-y-2">
                <label className="block font-bold text-[var(--text-muted)] uppercase">Dish Image</label>
                <div className="p-4 bg-[var(--bg-color)] rounded-2xl border border-[var(--border-color)] space-y-3">
                  {imagePreview ? (
                    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-[var(--border-color)] group">
                      <img src={imagePreview} alt="Dish Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center space-x-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Image</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 border-2 border-dashed border-[var(--border-color)] rounded-xl text-center space-y-2">
                      <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-60" />
                      <p className="text-xs text-[var(--text-muted)] font-medium">No custom image selected (Using default fallback system)</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md inline-flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                  />

                  {imageError && (
                    <p className="text-rose-400 font-bold text-[11px] flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{imageError}</span>
                    </p>
                  )}
                </div>
              </div>

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
                  id="availCheckAdmin"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
                <label htmlFor="availCheckAdmin" className="font-bold text-[var(--text-main)] cursor-pointer">
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up text-center">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[var(--text-main)] font-display">Delete Menu Item?</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong className="text-[var(--text-main)]">{deleteConfirmItem.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="py-2.5 bg-[var(--bg-color)] hover:bg-[var(--border-color)] text-[var(--text-muted)] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuView;
