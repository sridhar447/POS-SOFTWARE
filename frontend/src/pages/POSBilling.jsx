import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  CheckCircle2,
  User,
  Clock,
  Car,
  AlertCircle
} from 'lucide-react';
import BarcodeScannerInput from '../components/pos/BarcodeScannerInput';
import PaymentModal from '../components/pos/PaymentModal';
import InvoiceReceiptModal from '../components/pos/InvoiceReceiptModal';
import QuickProductPicker from '../components/pos/QuickProductPicker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const POSBilling = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerData, setCustomerData] = useState({ name: 'Walk-in Customer', phone: '' });

  const [scanLoading, setScanLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);

  const [showroomConfig, setShowroomConfig] = useState({});

  useEffect(() => {
    // Load showroom settings
    api.get('/settings/config')
      .then((res) => setShowroomConfig(res.data?.settings || {}))
      .catch(() => {});
  }, []);

  // Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F4: Complete Payment / Open checkout
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentModalOpen(true);
      }
      // F2: New Sale
      if (e.key === 'F2') {
        e.preventDefault();
        handleNewSale();
      }
      // F8: Open Quick Product Search
      if (e.key === 'F8') {
        e.preventDefault();
        setIsProductPickerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Handle scanning barcode
  const handleScanBarcode = async (barcode) => {
    // Check if barcode is already in the cart
    const exists = cart.some((item) => item.barcode.toUpperCase() === barcode.trim().toUpperCase());
    if (exists) {
      warning(`Barcode "${barcode}" is already in the shopping cart.`);
      return;
    }

    setScanLoading(true);
    try {
      const res = await api.post('/pos/scan', { barcode });
      if (res.success && res.data) {
        const unit = res.data;
        setCart((prev) => [...prev, unit]);
        success(`Added "${unit.product_name}" (${unit.barcode}) to cart.`);
      }
    } catch (err) {
      error(err.message || 'Scan verification failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleRemoveFromCart = (index) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from current cart?')) {
      setCart([]);
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setDiscountPercent(0);
    setCustomerData({ name: 'Walk-in Customer', phone: '' });
    setCompletedInvoice(null);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(false);
  };

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.price || 0), 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + parseFloat(item.discount_amount || 0), 0);
  const overallDiscount = (subtotal * parseFloat(discountPercent || 0)) / 100;
  const totalDiscount = totalItemDiscounts + overallDiscount;
  const taxableSubtotal = Math.max(0, subtotal - totalDiscount);
  
  // Tax calculation
  const totalTax = cart.reduce((acc, item) => {
    const itemTaxPct = parseFloat(item.tax_percent || 0);
    const itemBase = parseFloat(item.price || 0) - parseFloat(item.discount_amount || 0);
    return acc + (itemBase * itemTaxPct) / 100;
  }, 0);

  const grandTotal = taxableSubtotal + totalTax;

  // Checkout Execution
  const handleCompleteCheckout = async (paymentPayload) => {
    setCheckoutLoading(true);
    try {
      const payload = {
        customer_id: paymentPayload.customer_id,
        customer_name: paymentPayload.customer_name,
        customer_phone: paymentPayload.customer_phone,
        items: cart,
        subtotal,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        grand_total: grandTotal,
        payment_method: paymentPayload.payment_method,
        amount_received: paymentPayload.amount_received,
        change_returned: paymentPayload.change_returned,
        payment_reference: paymentPayload.payment_reference,
        notes: paymentPayload.notes
      };

      const res = await api.post('/pos/checkout', payload);
      if (res.success && res.data) {
        // Fetch single invoice view
        const fullInvoice = await api.get(`/sales/${res.data.saleId}`);
        setCompletedInvoice(fullInvoice.data.sale ? fullInvoice.data : { sale: res.data, items: cart, settings: showroomConfig });
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        success(`Sale completed! Invoice #${res.data.invoiceNumber}`);
      }
    } catch (err) {
      error(err.message || 'Checkout failed. Transaction was rolled back safely.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const showroomTitle = showroomConfig.showroom_name || 'VIP CAR DECOR';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-3">
      {/* Top POS Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide uppercase">{showroomTitle}</h2>
            <p className="text-[11px] text-blue-400 font-bold">RETAIL POS TERMINAL</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <User className="w-4 h-4 text-slate-400" />
            <span>Cashier: <strong className="text-white">{user?.name}</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left / Center: Scanner, Quick Search & Shopping Cart Table (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden min-h-0">
          {/* Scanner & Quick Search Bar */}
          <div className="p-3.5 border-b border-slate-800 bg-[#06090e]/80 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <BarcodeScannerInput onScan={handleScanBarcode} loading={scanLoading} autoFocus={true} />
            </div>
            <button
              type="button"
              onClick={() => setIsProductPickerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-blue-400 hover:text-white transition-all active:scale-95 flex-shrink-0"
              title="Quick Search Product (F8)"
            >
              <Search className="w-4 h-4" />
              <span>Search Showroom (F8)</span>
            </button>
          </div>

          {/* Cart Table Container */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-blue-400">
                  <Scan className="w-10 h-10 animate-bounce" />
                </div>
                <h4 className="text-base font-bold text-white">Ready to Scan Products</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Point USB barcode scanner at showroom price tag (e.g. <span className="font-mono font-bold text-blue-400">SH-SR1001</span>) or search catalog.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name / Barcode</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Price (₹)</th>
                    <th className="py-2.5 px-3 text-right">Disc</th>
                    <th className="py-2.5 px-3 text-right">GST %</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">{item.product_name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {item.barcode}
                          </span>
                          {item.size && <span className="text-[10px] text-slate-400">Size: {item.size}</span>}
                          {item.color && <span className="text-[10px] text-slate-400">Color: {item.color}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.sku}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        ₹{parseFloat(item.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-400">
                        {parseFloat(item.discount_amount || 0) > 0 ? `-₹${parseFloat(item.discount_amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">{item.tax_percent || 0}%</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-blue-300">
                        ₹{parseFloat(item.line_total || item.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart Footer Bar */}
          <div className="p-3 border-t border-slate-800 bg-[#06090e]/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              Total Items in Cart: <strong className="text-white font-mono">{cart.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors font-bold active:scale-95"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Right: Financial Summary & Complete Sale Panel (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl p-5 justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Billing Summary & Tax Breakdown
            </h3>

            {/* Quick Customer Selection */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer</label>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{customerData.name}</span>
                <span className="text-xs font-mono text-blue-400 font-bold">{customerData.phone || 'Walk-in'}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({cart.length} items):</span>
                <span className="font-mono font-bold text-white">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Additional Discount (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="w-16 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-right text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-blue-400 font-bold">
                  <span>Total Discounts:</span>
                  <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>GST / Tax Total:</span>
                <span className="font-mono font-bold text-slate-300">₹{totalTax.toFixed(2)}</span>
              </div>
            </div>

            {/* Big Grand Total Display */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border-2 border-blue-500/40 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">GRAND TOTAL</span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-4 px-6 text-sm font-black tracking-wide shadow-2xl shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-[0.98]"
            >
              <CreditCard className="w-5 h-5" />
              <span>COLLECT PAYMENT (F4)</span>
            </button>
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
              <span>Hotkeys: <strong className="text-white">F4</strong> Pay &bull; <strong className="text-white">F8</strong> Search &bull; <strong className="text-white">F2</strong> New</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        grandTotal={grandTotal}
        onCheckout={handleCompleteCheckout}
        loading={checkoutLoading}
        customerData={customerData}
        setCustomerData={setCustomerData}
      />

      {/* Invoice Receipt Modal */}
      {completedInvoice && (
        <InvoiceReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          invoiceData={completedInvoice.sale ? { ...completedInvoice.sale, items: completedInvoice.items, settings: completedInvoice.settings } : completedInvoice}
          onNewSale={handleNewSale}
        />
      )}

      {/* Quick Showroom Product Picker */}
      <QuickProductPicker
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onSelectBarcode={handleScanBarcode}
      />
    </div>
  );
};

export default POSBilling;
