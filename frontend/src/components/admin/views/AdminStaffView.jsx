import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Search,
  X,
} from 'lucide-react';
import api from '../../../services/api';

const roleBadges = {
  ADMIN: { label: 'ADMIN', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  VENDOR: { label: 'VENDOR / CASHIER', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  KITCHEN: { label: 'KITCHEN STAFF', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const AdminStaffView = ({ showToast }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'VENDOR' });
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data.staff || []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', formData);
      if (showToast) showToast('New staff account created successfully!');
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'VENDOR' });
      fetchStaff();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.response?.data?.error || 'Failed to create staff account', 'error');
    }
  };

  const handleToggleStatus = async (staff) => {
    try {
      await api.put(`/admin/staff/${staff.id}/status`, { isActive: !staff.isActive });
      if (showToast) showToast(`Staff account ${!staff.isActive ? 'activated' : 'deactivated'}!`);
      fetchStaff();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !resetPasswordInput) return;

    try {
      await api.post(`/admin/staff/${selectedStaff.id}/reset-password`, {
        password: resetPasswordInput,
      });
      if (showToast) showToast(`Password reset successfully for ${selectedStaff.name}!`);
      setShowResetModal(false);
      setResetPasswordInput('');
      setSelectedStaff(null);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to reset password', 'error');
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--card-bg)]/40 border border-[var(--border-color)] p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-main)] font-display">Staff Accounts & Authorization</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage administrative, cashier, and kitchen staff credentials and role permissions.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff Account</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search staff name, email, or role..."
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Staff Roster Table */}
      <div className="bg-[var(--card-bg)]/40 border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-[var(--text-muted)] animate-pulse">
            Loading Staff Accounts...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-[var(--text-muted)]">
            No staff accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-color)]/50 text-[10px] uppercase font-black tracking-wider text-[var(--text-muted)]">
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredStaff.map((staff) => {
                  const badge = roleBadges[staff.role] || { label: staff.role, bg: 'bg-slate-500/20 text-slate-400' };

                  return (
                    <tr key={staff.id} className="hover:bg-[var(--bg-color)]/40 transition-colors">
                      <td className="p-4 font-extrabold text-[var(--text-main)] flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-black flex items-center justify-center text-xs">
                          {staff.name ? staff.name[0].toUpperCase() : 'S'}
                        </div>
                        <span>{staff.name}</span>
                      </td>
                      <td className="p-4 font-mono text-[var(--text-muted)]">{staff.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border ${
                            staff.isActive !== false
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {staff.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-[var(--text-muted)]">
                        {new Date(staff.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowResetModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Password</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              staff.isActive !== false
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {staff.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <h3 className="text-base font-extrabold text-[var(--text-main)] font-display">Create Staff Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Cashier"
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@pos.com"
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">Assigned Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="VENDOR">Vendor / Cashier</option>
                  <option value="KITCHEN">Kitchen Staff</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-main)] font-display">Reset Staff Password</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedStaff.name} ({selectedStaff.email})</p>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase mb-1">New Secure Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Enter new password (min 6 chars)..."
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-color)] text-[var(--text-muted)] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffView;
