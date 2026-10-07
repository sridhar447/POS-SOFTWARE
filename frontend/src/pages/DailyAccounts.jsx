import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Lock,
  History
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const DailyAccounts = () => {
  const { success, error, warning } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Closing drawer form
  const [openingBalance, setOpeningBalance] = useState(0);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingClosing, setSubmittingClosing] = useState(false);
  const [closingsHistory, setClosingsHistory] = useState([]);

  useEffect(() => {
    fetchDailySummary();
    fetchClosingsHistory();
  }, [selectedDate]);

  const fetchDailySummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/accounts/daily-summary?date=${selectedDate}`);
      setSummary(res.data);
      if (res.data?.closingDetails) {
        setOpeningBalance(res.data.closingDetails.opening_balance || 0);
        setActualCash(res.data.closingDetails.actual_cash || '');
        setNotes(res.data.closingDetails.notes || '');
      } else {
        setActualCash('');
        setNotes('');
      }
    } catch (err) {
      error(err.message || 'Failed to load daily accounts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClosingsHistory = async () => {
    try {
      const res = await api.get('/accounts/closing-history');
      setClosingsHistory(res.data?.closings || []);
    } catch (e) {}
  };

  const handleClosingSubmit = async (e) => {
    e.preventDefault();
    if (actualCash === '') {
      warning('Please enter the counted physical cash in drawer.');
      return;
    }

    setSubmittingClosing(true);
    try {
      const payload = {
        closing_date: selectedDate,
        opening_balance: parseFloat(openingBalance) || 0,
        actual_cash: parseFloat(actualCash),
        notes
      };

      const res = await api.post('/accounts/daily-closing', payload);
      success(res.message || 'Daily drawer closing record saved!');
      fetchDailySummary();
      fetchClosingsHistory();
    } catch (err) {
      error(err.message || 'Failed to submit daily closing.');
    } finally {
      setSubmittingClosing(false);
    }
  };

  const s = summary || {};
  const sales = s.sales || {};

  const expectedCashCalculated = (parseFloat(openingBalance) || 0) + (sales.cash || 0) - (s.cashExpenses || 0);
  const actualCashVal = parseFloat(actualCash) || 0;
  const cashDifference = actualCash !== '' ? actualCashVal - expectedCashCalculated : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-blue-400" />
            <span>DAILY ACCOUNTS & CASH CLOSING</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cash drawer balancing, multi-channel payment reconciliation, and daily ledger sign-off
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-[#090d16] border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Revenue by Payment Method Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cash Sales"
          value={`₹${(sales.cash || 0).toFixed(2)}`}
          subtitle={`${sales.cashCount || 0} cash bills`}
          icon={Banknote}
          color="blue"
        />
        <StatCard
          title="UPI / QR Sales"
          value={`₹${(sales.upi || 0).toFixed(2)}`}
          subtitle={`${sales.upiCount || 0} UPI bills`}
          icon={QrCode}
          color="cyan"
        />
        <StatCard
          title="Card Sales"
          value={`₹${(sales.card || 0).toFixed(2)}`}
          subtitle={`${sales.cardCount || 0} card transactions`}
          icon={CreditCard}
          color="indigo"
        />
        <StatCard
          title="Gross Revenue"
          value={`₹${(sales.total || 0).toFixed(2)}`}
          subtitle={`${sales.totalCount || 0} total bills`}
          icon={DollarSign}
          color="sky"
        />
      </div>

      {/* Financial Summary & Drawer Reconciliation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Financial Ledger Breakdown (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
            Day's Financial Ledger Breakdown ({selectedDate})
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Total Sales Revenue:</span>
              <span className="font-mono font-bold text-blue-400">+₹{(sales.total || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Cost of Goods Sold (COGS):</span>
              <span className="font-mono font-semibold text-slate-400">-₹{(s.cogs || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-white font-bold">
              <span>Gross Profit (Sales - COGS):</span>
              <span className="font-mono text-blue-300 font-bold">₹{(s.grossProfit || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Day's Operating Expenses:</span>
              <span className="font-mono font-bold text-rose-400">-₹{(s.expenses || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
              <span>Customer Returns / Refunds:</span>
              <span className="font-mono font-bold text-amber-400">-₹{(s.refunds || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 pt-3 border-t-2 border-slate-700 text-sm font-black text-white">
              <span>Net Profit (Today):</span>
              <span className={`font-mono text-base ${(s.netProfit || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                ₹{(s.netProfit || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Cash Drawer Closing Form (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cash Drawer Balancing & Sign-off
            </h3>
            {s.isClosed && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                ✓ CLOSED
              </span>
            )}
          </div>

          <form onSubmit={handleClosingSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Opening Cash Float (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Expected Cash in Drawer</label>
                <div className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono font-bold text-blue-400">
                  ₹{expectedCashCalculated.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Actual Physical Cash Counted (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Count physical bills & coins in cash drawer..."
                className="w-full rounded-xl bg-slate-950 border-2 border-blue-500/50 px-4 py-2.5 text-lg font-mono font-bold text-white focus:border-blue-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Live Variance Calculation */}
            {actualCash !== '' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                <span className="text-slate-400">Drawer Difference / Variance:</span>
                <span className={`font-mono text-sm font-bold ${
                  cashDifference === 0 ? 'text-blue-400' : cashDifference > 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}>
                  {cashDifference === 0 ? '₹0.00 (Balanced Perfectly)' : cashDifference > 0 ? `+₹${cashDifference.toFixed(2)} (Excess)` : `-₹${Math.abs(cashDifference).toFixed(2)} (Shortage)`}
                </span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Closing Remarks / Audit Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Discrepancy explanation or shift notes..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submittingClosing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submittingClosing ? 'Saving Closing Record...' : 'Submit Official Daily Drawer Closing'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Past Closings Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Past 30 Days Cash Drawer Closings</span>
        </h3>
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                  <th className="py-3 px-4">Closing Date</th>
                  <th className="py-3 px-4 text-right">Opening Cash</th>
                  <th className="py-3 px-4 text-right">Cash Sales</th>
                  <th className="py-3 px-4 text-right">Expected Cash</th>
                  <th className="py-3 px-4 text-right">Actual Counted</th>
                  <th className="py-3 px-4 text-right">Difference</th>
                  <th className="py-3 px-4">Closed By</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {closingsHistory.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-500">No closing records stored yet.</td></tr>
                ) : (
                  closingsHistory.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{c.closing_date}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{parseFloat(c.opening_balance || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-blue-300">₹{parseFloat(c.total_sales_cash || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{parseFloat(c.expected_cash || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">₹{parseFloat(c.actual_cash || 0).toFixed(2)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        parseFloat(c.difference || 0) === 0 ? 'text-blue-400' : parseFloat(c.difference || 0) > 0 ? 'text-cyan-400' : 'text-rose-400'
                      }`}>
                        {parseFloat(c.difference || 0) > 0 ? `+₹${parseFloat(c.difference).toFixed(2)}` : `₹${parseFloat(c.difference || 0).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{c.closed_by_name || 'Admin'}</td>
                      <td className="py-3 px-4 text-slate-400">{c.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyAccounts;
