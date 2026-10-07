import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';

export const BarcodeLabel = ({ unit, showroomName = 'VIP CAR DECOR', currency = '₹' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (unit?.barcode && svgRef.current) {
      try {
        JsBarcode(svgRef.current, unit.barcode, {
          format: 'CODE128',
          width: 1.4,
          height: 35,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          lineColor: '#000000',
          background: '#ffffff'
        });
      } catch (e) {
        console.error('Barcode error:', e);
      }
    }
  }, [unit]);

  if (!unit) return null;

  return (
    <div className="w-[50mm] h-[35mm] bg-white text-black p-2 rounded-lg border border-slate-300 shadow-sm flex flex-col items-center justify-between text-center overflow-hidden font-sans">
      <div className="w-full truncate text-[9px] font-black tracking-wider uppercase">{showroomName}</div>
      <div className="w-full truncate text-[8px] font-bold text-slate-800">{unit.product_name || unit.sku}</div>
      <div className="my-0.5">
        <svg ref={svgRef} className="max-h-[16mm] max-w-full" />
      </div>
      <div className="w-full flex justify-between items-center px-1 text-[9px] font-bold">
        <span className="font-mono text-[8px] text-slate-700">{unit.sku}</span>
        <span className="font-mono text-slate-950 font-black">{currency}{parseFloat(unit.selling_price || 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default BarcodeLabel;
