import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Search,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Barcode,
  Truck,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const WarehouseStock = () => {
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [loading, setLoading] = useState(true);

  // Multi-select for batch transfer
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);

  useEffect(() => {
    fetchStock();
  }, [search, statusFilter]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/inventory/warehouse?${params.toString()}`);
      setUnits(res.data?.units || []);
      setStats(res.data?.stats || {});
      setSelectedBarcodes([]);
    } catch (err) {
      error(err.message || 'Failed to fetch warehouse stock.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const availableOnly = units.filter(u => u.status === 'AVAILABLE').map(u => u.barcode);
      setSelectedBarcodes(availableOnly);
    } else {
      setSelectedBarcodes([]);
    }
  };

  const handleToggleBarcode = (barcode) => {
    if (selectedBarcodes.includes(barcode)) {
      setSelectedBarcodes(selectedBarcodes.filter(b => b !== barcode));
    } else {
      setSelectedBarcodes([...selectedBarcodes, barcode]);
    }
  };

  const handleQuickTransferSelected = () => {
    if (selectedBarcodes.length === 0) {
      warning('Please select at least one unit barcode to transfer.');
      return;
    }
    navigate('/stock-transfer', { state: { preSelectedBarcodes: selectedBarcodes } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-blue-400" />
            <span>CENTRAL WAREHOUSE INVENTORY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Backstock warehouse storage &bull; Strict separation from retail showroom counter
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleQuickTransferSelected}
            disabled={selectedBarcodes.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Selected ({selectedBarcodes.length}) to Showroom</span>
          </button>
        </div>
      </div>

      {/* Critical Business Rule Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
        <div>
          <strong className="font-bold text-white uppercase tracking-wide">POS Billing Restriction:</strong> Products stored in the Central Warehouse CANNOT be directly billed at the POS counter. Use the Stock Transfer module to safely move units to the Showroom before customer sale.
        </div>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Available in Warehouse</p>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">{stats.total_available || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Damaged in Storage</p>
          <p className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.total_damaged || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Stored Units</p>
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
            placeholder="Search Warehouse Barcode, SKU, Supplier..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="AVAILABLE">AVAILABLE in Warehouse</option>
            <option value="DAMAGED">DAMAGED</option>
            <option value="ALL">ALL STATUSES</option>
          </select>
        </div>
      </div>

      {/* Warehouse Stock Table */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-[#06090e]/80">
                <th className="py-3 px-3 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedBarcodes.length > 0 && selectedBarcodes.length === units.filter(u => u.status === 'AVAILABLE').length}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                </th>
                <th className="py-3 px-3">Unique Barcode</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Supplier & Purchase</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading warehouse units...</td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No warehouse stock matching filters.</td>
                </tr>
              ) : (
                units.map((u) => {
                  const isChecked = selectedBarcodes.includes(u.barcode);
                  return (
                    <tr
                      key={u.unit_id}
                      onClick={() => u.status === 'AVAILABLE' && handleToggleBarcode(u.barcode)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${
                        isChecked ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={u.status !== 'AVAILABLE'}
                          checked={isChecked}
                          onChange={() => handleToggleBarcode(u.barcode)}
                          className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">{u.barcode}</td>
                      <td className="py-3 px-3 font-bold text-white">{u.product_name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{u.sku}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">{u.supplier_name || 'Stock In'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.purchase_number || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ₹{parseFloat(u.purchase_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ₹{parseFloat(u.selling_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge status={u.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WarehouseStock;
