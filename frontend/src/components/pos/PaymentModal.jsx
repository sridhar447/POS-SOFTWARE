import React, { useState, useEffect } from 'react';
import { Banknote, QrCode, CreditCard, Layers, CheckCircle2, UserCheck } from 'lucide-react';
import Modal from '../common/Modal';

export const PaymentModal = ({
  isOpen,
  onClose,
  grandTotal = 0,
  onCheckout,
  loading = false,
  customerData,
  setCustomerData
}) => {
  const [method, setMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmountReceived(grandTotal.toString());
      setReference('');
      setNotes('');
    }
  }, [isOpen, grandTotal]);

  const receivedVal = parseFloat(amountReceived) || 0;
  const changeReturned = Math.max(0, receivedVal - grandTotal);
  const remainingDue = Math.max(0, grandTotal - receivedVal);

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 500) * 500 || 500,
    Math.ceil(grandTotal / 1000) * 1000 || 1000,
    Math.ceil(grandTotal / 2000) * 2000 || 2000
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handlePay = () => {
    if (method === 'CASH' && receivedVal < grandTotal) {
      alert('Received cash amount cannot be less than Grand Total.');
      return;
    }

    onCheckout({
      payment_method: method,
      amount_received: method === 'CASH' ? receivedVal : grandTotal,
      change_returned: method === 'CASH' ? changeReturned : 0,
      payment_reference: reference,
      notes,
      customer_id: customerData?.id || null,
      customer_name: customerData?.name || 'Walk-in Customer',
      customer_phone: customerData?.phone || ''
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete POS Payment"
      subtitle={`Total Payable Amount: ₹${grandTotal.toFixed(2)}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Customer Quick Lookup / Input */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-400" /> Customer Information
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">(Optional for walk-in)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Customer Phone</label>
              <input
                type="tel"
                value={customerData?.phone || ''}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                placeholder="e.g. 9841122334"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Customer Name</label>
              <input
                type="text"
                value={customerData?.name || ''}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                placeholder="e.g. Rahul Varma"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI / QR', icon: QrCode },
              { id: 'CARD', label: 'Debit/Card', icon: CreditCard },
              { id: 'OTHER', label: 'Split/Other', icon: Layers }
            ].map((pm) => {
              const Icon = pm.icon;
              const isSelected = method === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/20 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Calculation View */}
        {method === 'CASH' && (
          <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Cash Received from Customer (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border-2 border-blue-500/50 px-4 py-3 text-xl font-mono font-bold text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            {/* Quick cash pills */}
            <div className="flex flex-wrap gap-2">
              {quickCashOptions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountReceived(amt.toString())}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-blue-400 transition-colors active:scale-95"
                >
                  ₹{amt.toFixed(0)}
                </button>
              ))}
            </div>

            {/* Change returned calculation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Balance / Change to Return:</span>
              <span className="text-lg font-mono font-black text-blue-400">
                ₹{changeReturned.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* UPI / Card Reference */}
        {method !== 'CASH' && (
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              {method === 'UPI' ? 'UPI Transaction Reference / UTR Number' : 'Card Transaction Auth / Last 4 Digits'}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR-982347102934 or Auth-5591"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Billing Notes / Remarks</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special customer requests or discount note..."
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={loading || (method === 'CASH' && receivedVal < grandTotal)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Processing Transaction...' : `Complete Sale (₹${grandTotal.toFixed(2)})`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
