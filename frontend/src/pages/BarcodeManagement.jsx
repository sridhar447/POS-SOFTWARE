import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Search,
  Printer,
  Download,
  Filter,
  Eye,
  Store,
  Warehouse,
  CheckCircle2
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import BarcodeLabel from '../components/barcode/BarcodeLabelViewer';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const BarcodeManagement = () => {
  const { error } = useToast();
  const [barcodes, setBarcodes] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected for single view or batch print
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isSinglePrintOpen, setIsSinglePrintOpen] = useState(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  useEffect(() => {
    fetchBarcodes();
  }, [search, locationFilter, statusFilter]);

  const fetchBarcodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (locationFilter) params.append('location_id', locationFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/inventory/barcodes?${params.toString()}`);
      setBarcodes(res.data?.barcodes || []);
    } catch (err) {
      error(err.message || 'Failed to load barcodes.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSingle = (unit) => {
    setSelectedUnit(unit);
    setIsSinglePrintOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Barcode className="w-6 h-6 text-blue-400" />
            <span>BARCODE GENERATION & LABEL PRINTING</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search physical unit barcodes, generate thermal stickers, and batch print barcode labels
          </p>
        </div>

        <button
          onClick={() => setIsBatchPrintOpen(true)}
          disabled={barcodes.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Batch Print Current View ({barcodes.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Barcode, SKU, Product Name..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Locations</option>
          <option value="1">Showroom Floor (Location 1)</option>
          <option value="2">Central Warehouse (Location 2)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="SOLD">SOLD</option>
          <option value="DAMAGED">DAMAGED</option>
          <option value="TRANSFERRED">TRANSFERRED</option>
        </select>
      </div>

      {/* Barcodes Table */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Barcode Tag</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Current Physical Location</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Unit Status</th>
                <th className="py-3 px-4 text-center">Print Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Loading barcode inventory...</td></tr>
              ) : barcodes.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No barcode records found.</td></tr>
              ) : (
                barcodes.map((u) => (
                  <tr key={u.unit_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{u.barcode}</td>
                    <td className="py-3 px-4 font-bold text-white">{u.product_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.sku}</td>
                    <td className="py-3 px-4 font-semibold">
                      {u.location_code === 'SHOWROOM' ? (
                        <span className="text-blue-400 flex items-center gap-1"><Store className="w-3.5 h-3.5" /> Showroom</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1"><Warehouse className="w-3.5 h-3.5" /> Warehouse</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{parseFloat(u.selling_price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center"><Badge status={u.status} /></td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handlePrintSingle(u)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 text-xs font-semibold transition-colors active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Barcode Print Modal */}
      <Modal
        isOpen={isSinglePrintOpen}
        onClose={() => setIsSinglePrintOpen(false)}
        title="Thermal Barcode Sticker"
        subtitle={`Product: ${selectedUnit?.product_name}`}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center space-y-5">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner flex justify-center">
            {selectedUnit && <BarcodeLabel unit={selectedUnit} />}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </Modal>

      {/* Batch Barcode Print Modal */}
      <Modal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        title="Batch Barcode Printing Sheet"
        subtitle={`Printing ${barcodes.length} Barcode Sticker Labels`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">
              Formatted for 2-column or 3-column adhesive sticker roll / A4 label paper.
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print All ({barcodes.length})</span>
            </button>
          </div>

          <div id="printable-barcodes" className="max-h-[500px] overflow-y-auto p-4 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {barcodes.map((u) => (
              <BarcodeLabel key={u.unit_id} unit={u} />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BarcodeManagement;
