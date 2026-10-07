import React, { useState, useEffect } from 'react';
import { Search, Plus, Store, Tag } from 'lucide-react';
import Modal from '../common/Modal';
import api from '../../services/api';

export const QuickProductPicker = ({ isOpen, onClose, onSelectBarcode }) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      fetchItems('');
    }
  }, [isOpen]);

  const fetchItems = async (search) => {
    setLoading(true);
    try {
      const res = await api.get(`/pos/search?query=${encodeURIComponent(search || '')}`);
      setItems(res.data?.items || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    fetchItems(val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Showroom Product Search"
      subtitle="Search available showroom stock to add directly to cart"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search by Product Name, SKU, or Barcode..."
            autoFocus
            className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Searching showroom stock...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching available showroom items found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((item) => (
                <div
                  key={item.unit_id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate group-hover:text-blue-300">
                      {item.product_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {item.barcode}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-white mt-1.5">
                      ₹{parseFloat(item.selling_price || 0).toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectBarcode(item.barcode);
                      onClose();
                    }}
                    className="flex-shrink-0 p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all active:scale-95"
                    title="Add to Cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default QuickProductPicker;
