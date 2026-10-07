import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Calendar,
  CreditCard,
  User,
  Download
} from 'lucide-react';
import Badge from '../components/common/Badge';
import InvoiceReceiptModal from '../components/pos/InvoiceReceiptModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Sales = () => {
  const { error } = useToast();
  const { user, isAdmin } = useAuth();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Selected Invoice Modal
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [search, startDate, endDate, paymentMethod]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (paymentMethod) params.append('payment_method', paymentMethod);

      const res = await api.get(`/sales?${params.toString()}`);
      setSales(res.data?.sales || []);
    } catch (err) {
      error(err.message || 'Failed to fetch sales history.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale.id}`);
      setSelectedInvoiceData({
        ...res.data.sale,
        items: res.data.items,
        settings: res.data.settings
      });
      setIsInvoiceModalOpen(true);
    } catch (err) {
      error(err.message || 'Failed to fetch invoice details.');
    }
  };

  const totalSalesAmount = sales.reduce((a, b) => a + parseFloat(b.grand_total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-400" />
            <span>{isAdmin ? 'SALES & INVOICES REGISTRY' : 'MY SALES HISTORY'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time retail billing register &bull; View, reprint and audit POS transactions
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 text-right shadow-lg">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Filtered Sales</p>
          <p className="text-xl font-black text-blue-400 font-mono">
            ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Invoice # or Customer..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

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

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Payment Modes</option>
          <option value="CASH">CASH</option>
          <option value="UPI">UPI / QR</option>
          <option value="CARD">CARD</option>
          <option value="OTHER">OTHER / SPLIT</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name & Phone</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Payment Mode</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading invoices...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500">No sale records match your criteria.</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{s.invoice_number}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{s.sale_date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{s.customer_name || 'Walk-in Customer'}</div>
                      <div className="text-[10px] font-mono text-slate-500">{s.customer_phone || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{s.cashier_name}</td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-300">{s.total_items}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-blue-300">
                      ₹{parseFloat(s.grand_total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewInvoice(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white text-xs font-bold transition-colors active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice View Modal */}
      {selectedInvoiceData && (
        <InvoiceReceiptModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoiceData={selectedInvoiceData}
          onNewSale={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Sales;
