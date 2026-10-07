import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Store,
  Warehouse,
  History
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const SalesReturn = () => {
  const { success, error, warning } = useToast();

  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [searchedSale, setSearchedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [loadingSale, setLoadingSale] = useState(false);

  // Return Form State
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [returnDestination, setReturnDestination] = useState('SHOWROOM');
  const [conditionStatus, setConditionStatus] = useState('GOOD');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('Customer Exchange / Dissatisfaction');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [processing, setProcessing] = useState(false);
  const [returnsHistory, setReturnsHistory] = useState([]);

  useEffect(() => {
    fetchReturnsHistory();
  }, []);

  const fetchReturnsHistory = async () => {
    try {
      const res = await api.get('/returns');
      setReturnsHistory(res.data?.returns || []);
    } catch (e) {}
  };

  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceQuery.trim()) return;

    setLoadingSale(true);
    setSearchedSale(null);
    setSaleItems([]);
    setSelectedBarcode('');

    try {
      const res = await api.get(`/sales/${invoiceQuery.trim()}`);
      if (res.data?.sale) {
        setSearchedSale(res.data.sale);
        setSaleItems(res.data.items || []);
        if (res.data.items?.length > 0) {
          setSelectedBarcode(res.data.items[0].barcode);
          setRefundAmount(res.data.items[0].line_total);
        }
      }
    } catch (err) {
      error(err.message || 'Invoice not found.');
    } finally {
      setLoadingSale(false);
    }
  };

  const handleSelectBarcodeChange = (barcode) => {
    setSelectedBarcode(barcode);
    const item = saleItems.find(i => i.barcode === barcode);
    if (item) {
      setRefundAmount(item.line_total);
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!searchedSale || !selectedBarcode) {
      warning('Please search an invoice and select the unit barcode to return.');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        invoice_number: searchedSale.invoice_number,
        reason,
        payment_method: paymentMethod,
        items: [
          {
            barcode: selectedBarcode,
            refund_amount: parseFloat(refundAmount) || 0,
            return_destination: returnDestination,
            condition_status: conditionStatus
          }
        ]
      };

      const res = await api.post('/returns', payload);
      success(res.message || 'Sales return processed successfully.');
      setSearchedSale(null);
      setSaleItems([]);
      setInvoiceQuery('');
      fetchReturnsHistory();
    } catch (err) {
      error(err.message || 'Failed to process return.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
          <RotateCcw className="w-6 h-6 text-blue-400" />
          <span>SALES RETURN & RESTOCKING</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Validate original sold barcodes, process customer refunds, and route items back to Showroom or Warehouse
        </p>
      </div>

      {/* Lookup & Process Return Card */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-2xl space-y-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          1. Lookup Original Invoice
        </h3>
        <form onSubmit={handleSearchInvoice} className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={invoiceQuery}
            onChange={(e) => setInvoiceQuery(e.target.value)}
            placeholder="Enter Invoice Number (e.g. INV-2026-000001)..."
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loadingSale || !invoiceQuery.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>{loadingSale ? 'Searching...' : 'Find Invoice'}</span>
          </button>
        </form>

        {searchedSale && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-5 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400">Verified Sale</span>
                <h4 className="text-sm font-bold text-white font-mono">{searchedSale.invoice_number}</h4>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-400 block">Sale Date: <strong className="text-white">{searchedSale.sale_date}</strong></span>
                <span className="text-slate-400">Customer: <strong className="text-white">{searchedSale.customer_name}</strong></span>
              </div>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Select Barcode to return */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Select Sold Item / Barcode *
                  </label>
                  <select
                    value={selectedBarcode}
                    onChange={(e) => handleSelectBarcodeChange(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
                  >
                    {saleItems.map((item) => (
                      <option key={item.barcode} value={item.barcode}>
                        {item.barcode} &bull; {item.product_name} (₹{parseFloat(item.line_total).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Return Destination */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Restock Destination Location *
                  </label>
                  <select
                    value={returnDestination}
                    onChange={(e) => setReturnDestination(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-bold transition-colors"
                  >
                    <option value="SHOWROOM">SHOWROOM (Restock for resale)</option>
                    <option value="WAREHOUSE">WAREHOUSE (Move to storage)</option>
                    <option value="DAMAGED">DAMAGED (Quarantine - do not resell)</option>
                  </select>
                </div>

                {/* Refund Amount */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-blue-500/50 px-3 py-2 text-xs font-mono font-bold text-blue-300 focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Refund Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="CASH">CASH Refund</option>
                    <option value="UPI">UPI Refund</option>
                    <option value="OTHER">Store Credit / Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{processing ? 'Processing Return...' : 'Authorize Return & Issue Refund'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Past Returns History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Sales Return Records</span>
        </h3>
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Original Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Refund Amount (₹)</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {returnsHistory.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No return records found.</td></tr>
                ) : (
                  returnsHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{r.return_number}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-300">{r.invoice_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{r.return_date}</td>
                      <td className="py-3 px-4 text-white font-semibold">{r.customer_name || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-400">
                        ₹{parseFloat(r.total_refund_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{r.reason || '-'}</td>
                      <td className="py-3 px-4 text-slate-300">{r.processed_by_name || 'Admin'}</td>
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

export default SalesReturn;
