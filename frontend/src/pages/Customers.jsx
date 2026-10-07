import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Phone, Mail, MapPin, ShoppingBag } from 'lucide-react';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Customers = () => {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'REGISTERED'
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.data?.customers || []);
    } catch (err) {
      error(err.message || 'Failed to load customer directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', formData);
      success('Customer registered successfully.');
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'REGISTERED' });
      fetchCustomers();
    } catch (err) {
      error(err.message || 'Failed to add customer.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-blue-400" />
            <span>CUSTOMER DIRECTORY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Walk-in clients & registered showroom customers</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer phone or name..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
              <th className="py-3 px-4">Customer Name</th>
              <th className="py-3 px-4">Phone Number</th>
              <th className="py-3 px-4">Email / Address</th>
              <th className="py-3 px-4 text-center">Type</th>
              <th className="py-3 px-4 text-center">Total Invoices</th>
              <th className="py-3 px-4 text-right">Lifetime Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading customers...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500">No customers found.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-blue-400 font-bold">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{c.email || '-'}</div>
                    <div className="text-[10px] text-slate-500">{c.address || '-'}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                      {c.customer_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-white font-mono">{c.total_orders || 0}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">
                    ₹{parseFloat(c.total_spent || 0).toFixed(2)}
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
        title="Register Customer"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9841122334"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
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
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Address</label>
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
              Register Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
