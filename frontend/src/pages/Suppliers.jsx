import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2 } from 'lucide-react';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Suppliers = () => {
  const { success, error } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    opening_balance: 0,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/suppliers?search=${encodeURIComponent(search)}`);
      setSuppliers(res.data?.suppliers || []);
    } catch (err) {
      error(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      opening_balance: 0,
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gst_number: s.gst_number || '',
      opening_balance: s.opening_balance || 0,
      status: s.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        success('Supplier updated successfully.');
      } else {
        await api.post('/suppliers', formData);
        success('New supplier added successfully.');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      error(err.message || 'Failed to save supplier.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-400" />
            <span>SUPPLIER MANAGEMENT</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Vendor ledger, contact directory, and purchase balances</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier name, phone, GSTIN..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
              <th className="py-3 px-4">Supplier Name</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">GSTIN</th>
              <th className="py-3 px-4 text-center">Total Orders</th>
              <th className="py-3 px-4 text-right">Total Purchased</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading suppliers...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">No suppliers registered.</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{s.phone || '-'}</div>
                    <div className="text-[10px] text-slate-500">{s.email || '-'}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{s.gst_number || '-'}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-400 font-mono">{s.total_purchases || 0}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">
                    ₹{parseFloat(s.total_purchase_amount || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center"><Badge status={s.status} /></td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors active:scale-95"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Vendor/Supplier'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Supplier / Firm Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GSTIN / Tax ID</label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Business Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
