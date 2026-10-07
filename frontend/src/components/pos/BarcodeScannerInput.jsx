import React, { useState, useRef, useEffect } from 'react';
import { Scan, Search, CornerDownLeft } from 'lucide-react';

export const BarcodeScannerInput = ({ onScan, loading, autoFocus = true }) => {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!barcode.trim() || loading) return;
    onScan(barcode.trim());
    setBarcode('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-blue-400">
          <Scan className="w-5 h-5 animate-pulse" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan Barcode (e.g. SH-SR1001) or enter manually..."
          disabled={loading}
          autoComplete="off"
          className="w-full rounded-2xl bg-[#090d16] border-2 border-blue-500/40 pl-12 pr-28 py-3.5 text-sm font-mono font-medium text-white placeholder-slate-400 shadow-xl focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          <button
            type="submit"
            disabled={loading || !barcode.trim()}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 active:scale-95 border border-blue-400/30"
          >
            <span>{loading ? 'Validating...' : 'Scan'}</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default BarcodeScannerInput;
