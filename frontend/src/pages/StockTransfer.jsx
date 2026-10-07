import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Store,
  Warehouse,
  Plus,
  CheckCircle2,
  Trash2,
  Barcode,
  History,
  AlertCircle
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const StockTransfer = () => {
  const { success, error, warning } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [fromLocation, setFromLocation] = useState(2); // Default Warehouse
  const [toLocation, setToLocation] = useState(1);     // Default Showroom
  const [transferMode, setTransferMode] = useState('BARCODES'); // 'BARCODES' or 'PRODUCT_QTY'

  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [reason, setReason] = useState('Regular Showroom Replenishment');

  const [loading, setLoading] = useState(false);
  const [transfersHistory, setTransfersHistory] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchTransferHistory();

    // Check if barcodes were passed from Warehouse Stock page
    if (location.state?.preSelectedBarcodes) {
      setSelectedBarcodes(location.state.preSelectedBarcodes);
    }
    if (location.state?.product_id) {
      setSelectedProductId(location.state.product_id);
      setTransferMode('PRODUCT_QTY');
    }
  }, [location]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?status=ACTIVE');
      setProducts(res.data?.products || []);
    } catch (e) {}
  };

  const fetchTransferHistory = async () => {
    try {
      const res = await api.get('/transfers');
      setTransfersHistory(res.data?.transfers || []);
    } catch (e) {}
  };

  const handleAddBarcode = (e) => {
    e.preventDefault();
    const clean = barcodeInput.trim().toUpperCase();
    if (!clean) return;

    if (selectedBarcodes.includes(clean)) {
      warning(`Barcode ${clean} is already added to transfer list.`);
      return;
    }

    setSelectedBarcodes([...selectedBarcodes, clean]);
    setBarcodeInput('');
  };

  const handleRemoveBarcode = (code) => {
    setSelectedBarcodes(selectedBarcodes.filter(b => b !== code));
  };

  const handleExecuteTransfer = async () => {
    if (fromLocation === toLocation) {
      error('Source and Destination locations must be different.');
      return;
    }

    if (transferMode === 'BARCODES' && selectedBarcodes.length === 0) {
      warning('Please add at least one unit barcode to transfer.');
      return;
    }

    if (transferMode === 'PRODUCT_QTY' && (!selectedProductId || transferQty <= 0)) {
      warning('Please select a product and valid quantity to transfer.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        from_location_id: fromLocation,
        to_location_id: toLocation,
        reason,
        transfer_date: new Date().toISOString().slice(0, 10),
        ...(transferMode === 'BARCODES' ? { barcodes: selectedBarcodes } : { product_id: selectedProductId, quantity: transferQty })
      };

      const res = await api.post('/transfers', payload);
      success(res.message || 'Stock transfer executed successfully!');
      setSelectedBarcodes([]);
      fetchTransferHistory();
    } catch (err) {
      error(err.message || 'Stock transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
          <ArrowRightLeft className="w-6 h-6 text-blue-400" />
          <span>STOCK TRANSFER ENGINE</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Move physical product units between Central Warehouse and Retail Showroom Floor
        </p>
      </div>

      {/* Transfer Builder Card */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-2xl space-y-6">
        {/* Step 1: Location Route Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
          {/* From Location */}
          <div className="md:col-span-3 rounded-2xl bg-slate-950 border-2 border-slate-800 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5" /> Source Location (FROM)
            </span>
            <select
              value={fromLocation}
              onChange={(e) => setFromLocation(parseInt(e.target.value, 10))}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
            >
              <option value={2}>Central Warehouse (Location 2)</option>
              <option value={1}>Showroom Floor (Location 1)</option>
            </select>
          </div>

          {/* Arrow */}
          <div className="md:col-span-1 flex justify-center text-blue-400">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>

          {/* To Location */}
          <div className="md:col-span-3 rounded-2xl bg-slate-950 border-2 border-blue-500/40 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> Destination Location (TO)
            </span>
            <select
              value={toLocation}
              onChange={(e) => setToLocation(parseInt(e.target.value, 10))}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
            >
              <option value={1}>Showroom Floor (Location 1)</option>
              <option value={2}>Central Warehouse (Location 2)</option>
            </select>
          </div>
        </div>

        {/* Step 2: Transfer Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setTransferMode('BARCODES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              transferMode === 'BARCODES'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Transfer by Barcodes ({selectedBarcodes.length} Units)
          </button>
          <button
            type="button"
            onClick={() => setTransferMode('PRODUCT_QTY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              transferMode === 'PRODUCT_QTY'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Transfer by Product & Quantity
          </button>
        </div>

        {/* Step 3: Selection Body */}
        {transferMode === 'BARCODES' ? (
          <div className="space-y-4">
            <form onSubmit={handleAddBarcode} className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter source barcode (e.g. SH-WH2001)..."
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!barcodeInput.trim()}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 border border-blue-400/30 disabled:opacity-50 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Barcode</span>
              </button>
            </form>

            {/* Added Barcodes Chips */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 min-h-24">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                Barcodes Ready for Movement:
              </span>
              {selectedBarcodes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No barcodes added yet. Scan barcodes or select them from Warehouse inventory.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedBarcodes.map((code) => (
                    <div
                      key={code}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-blue-400 shadow-sm"
                    >
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBarcode(code)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-3 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Catalog Item</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) &bull; Warehouse Avail: {p.warehouse_stock}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Quantity to Move</label>
              <input
                type="number"
                min="1"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-3 text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Reason / Notes */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Transfer Reason / Audit Note</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Execute Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleExecuteTransfer}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Executing Transfer...' : 'Complete Stock Transfer'}</span>
          </button>
        </div>
      </div>

      {/* Transfer History Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Stock Transfer History Log</span>
        </h3>
        <div className="rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4">Transferred By</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transfersHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">No past transfer records found.</td>
                  </tr>
                ) : (
                  transfersHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{t.transfer_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{t.transfer_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-300">{t.from_location_name}</td>
                      <td className="py-3 px-4 font-semibold text-blue-400">{t.to_location_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-white font-mono">{t.total_quantity} Units</td>
                      <td className="py-3 px-4 text-slate-300">{t.transferred_by_name || 'Admin'}</td>
                      <td className="py-3 px-4 text-slate-400">{t.reason || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge status={t.status} />
                      </td>
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

export default StockTransfer;
