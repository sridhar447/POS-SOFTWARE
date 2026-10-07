import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  ArrowRightLeft,
  Barcode,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import BarcodeLabel from '../components/barcode/BarcodeLabelViewer';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const ShowroomStock = () => {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [loading, setLoading] = useState(true);

  // Selected unit for barcode modal
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  useEffect(() => {
    fetchStock();
  }, [search, statusFilter]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/inventory/showroom?${params.toString()}`);
      setUnits(res.data?.units || []);
      setStats(res.data?.stats || {});
    } catch (err) {
      error(err.message || 'Failed to fetch showroom inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBarcode = (unit) => {
    setSelectedUnit(unit);
    setIsBarcodeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Store className="w-6 h-6 text-blue-400" />
            <span>SHOWROOM INVENTORY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Physical stock verified on showroom display floor &bull; Ready for customer POS billing
          </p>
        </div>

        <button
          onClick={() => navigate('/stock-transfer')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Transfer from Warehouse</span>
        </button>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Available on Floor</p>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">{stats.total_available || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Sold from Showroom</p>
          <p className="text-2xl font-black text-slate-300 font-mono mt-1">{stats.total_sold || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Marked Damaged</p>
          <p className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.total_damaged || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Tracked Units</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{stats.total_units || 0}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Barcode, SKU, Product..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="AVAILABLE">AVAILABLE (For Sale)</option>
            <option value="SOLD">SOLD</option>
            <option value="DAMAGED">DAMAGED</option>
            <option value="ALL">ALL STATUSES</option>
          </select>
        </div>
      </div>

      {/* Showroom Table */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                <th className="py-3 px-4">Unique Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU / Specs</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Print Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading showroom units...</td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">No matching showroom items found.</td>
                </tr>
              ) : (
                units.map((u) => (
                  <tr key={u.unit_id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {u.barcode}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{u.product_name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {u.sku}
                      {(u.size || u.color) && <span className="text-[10px] text-slate-500 ml-1">({u.size} / {u.color})</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{u.category_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{parseFloat(u.selling_price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={u.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintBarcode(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-white border border-slate-700 hover:border-blue-500/40 text-xs font-semibold transition-all active:scale-95"
                      >
                        <Barcode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Tag</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Label Modal */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title="Showroom Barcode Label"
        subtitle={`Product: ${selectedUnit?.product_name}`}
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center space-y-5">
          <div className="p-4 bg-white rounded-2xl border border-slate-300 shadow-inner flex justify-center">
            {selectedUnit && <BarcodeLabel unit={selectedUnit} />}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label Tag</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ShowroomStock;
