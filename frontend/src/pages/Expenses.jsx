import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Calendar, Filter, Trash2 } from 'lucide-react';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Maintenance',
  'Purchase Payment',
  'Internet',
  'Showroom Decor & Display',
  'Other'
];

export const Expenses = () => {
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Electricity',
    description: '',
    amount: '',
    payment_method: 'CASH',
    expense_date: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter, startDate, endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await api.get(`/accounts/expenses?${params.toString()}`);
      setExpenses(res.data?.expenses || []);
      setTotalExpenses(res.data?.totalExpenses || 0);
    } catch (err) {
      error(err.message || 'Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts/expenses', formData);
      success('Expense logged successfully.');
      setIsModalOpen(false);
      setFormData({
        category: 'Electricity',
        description: '',
        amount: '',
        payment_method: 'CASH',
        expense_date: new Date().toISOString().slice(0, 10)
      });
      fetchExpenses();
    } catch (err) {
      error(err.message || 'Failed to log expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-400" />
            <span>OPERATING EXPENSE TRACKER</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Showroom utility bills, rent, maintenance, transport, and petty cash logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 text-right shadow-lg">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Operating Expenses</p>
            <p className="text-xl font-black text-rose-400 font-mono">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expense description..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
            placeholder="Start Date"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Notes</th>
                <th className="py-3 px-4 text-center">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No expense records found.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">{e.expense_number}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{e.expense_date}</td>
                    <td className="py-3 px-4 font-bold text-white">{e.category}</td>
                    <td className="py-3 px-4 text-slate-300">{e.description || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {e.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-400">
                      ₹{parseFloat(e.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{e.created_by_name || 'Admin'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Operating Expense"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Expense Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full rounded-xl bg-slate-950 border border-blue-500/50 px-3.5 py-2 text-sm font-mono font-bold text-blue-300 focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description / Bill Memo</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Bill reference, payee details, reason..."
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
              Log Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
