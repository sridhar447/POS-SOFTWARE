import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Truck,
  Store,
  Warehouse,
  ArrowRightLeft,
  DollarSign,
  Users,
  Download,
  Printer,
  Calendar,
  Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Reports = () => {
  const { error } = useToast();
  const [activeTab, setActiveTab] = useState('SALES');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [salesReport, setSalesReport] = useState({ summary: [], topProducts: [] });
  const [purchaseReport, setPurchaseReport] = useState({ purchases: [], summary: {} });
  const [stockReport, setStockReport] = useState({ stockItems: [], summary: {} });
  const [movementReport, setMovementReport] = useState({ movements: [] });
  const [profitReport, setProfitReport] = useState(null);
  const [staffReport, setStaffReport] = useState({ staffSales: [] });

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async (tab) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      if (tab === 'SALES') {
        const res = await api.get(`/reports/sales?${params.toString()}`);
        setSalesReport(res.data || { summary: [], topProducts: [] });
      } else if (tab === 'PURCHASE') {
        const res = await api.get(`/reports/purchases?${params.toString()}`);
        setPurchaseReport(res.data || { purchases: [], summary: {} });
      } else if (tab === 'STOCK') {
        const res = await api.get(`/reports/stock?${params.toString()}`);
        setStockReport(res.data || { stockItems: [], summary: {} });
      } else if (tab === 'MOVEMENTS') {
        const res = await api.get(`/reports/stock-movements?${params.toString()}`);
        setMovementReport(res.data || { movements: [] });
      } else if (tab === 'PROFIT') {
        const res = await api.get(`/reports/profit-loss?${params.toString()}`);
        setProfitReport(res.data || null);
      } else if (tab === 'STAFF') {
        const res = await api.get(`/reports/staff-sales?${params.toString()}`);
        setStaffReport(res.data || { staffSales: [] });
      }
    } catch (err) {
      error(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    let rows = [];

    if (activeTab === 'SALES') {
      rows.push(['Period', 'Total Bills', 'Subtotal', 'Tax', 'Discount', 'Grand Total', 'Cash Sales', 'UPI Sales', 'Card Sales']);
      salesReport.summary.forEach(r => {
        rows.push([r.period, r.total_bills, r.total_subtotal, r.total_tax, r.total_discount, r.total_sales, r.cash_sales, r.upi_sales, r.card_sales]);
      });
    } else if (activeTab === 'STOCK') {
      rows.push(['SKU', 'Product Name', 'Showroom Units', 'Warehouse Units', 'Damaged Units', 'Cost Price', 'Selling Price']);
      stockReport.stockItems.forEach(r => {
        rows.push([r.sku, `"${r.name}"`, r.showroom_units, r.warehouse_units, r.damaged_units, r.purchase_price, r.selling_price]);
      });
    } else if (activeTab === 'MOVEMENTS') {
      rows.push(['Movement ID', 'Date', 'Barcode', 'Product', 'Type', 'From Location', 'To Location', 'User']);
      movementReport.movements.forEach(m => {
        rows.push([m.id, m.movement_date, m.barcode, `"${m.product_name}"`, m.movement_type, m.from_location_name || '-', m.to_location_name || '-', m.user_name || '-']);
      });
    } else if (activeTab === 'STAFF') {
      rows.push(['Staff Name', 'Email', 'Total Bills', 'Total Sales (INR)', 'Cash', 'UPI', 'Card']);
      staffReport.staffSales.forEach(s => {
        rows.push([s.staff_name, s.staff_email, s.total_bills, s.total_sales, s.cash_sales, s.upi_sales, s.card_sales]);
      });
    } else {
      rows.push(['Report Tab', activeTab, 'Generated', new Date().toISOString()]);
    }

    const encodedUri = encodeURI(csvContent + rows.map(e => e.join(',')).join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab.toLowerCase()}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>EXECUTIVE REPORTS & AUDIT CENTER</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive business intelligence, inventory valuation, P&L, and staff sales audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-3">
        {[
          { id: 'SALES', label: 'Sales Report', icon: TrendingUp },
          { id: 'PURCHASE', label: 'Purchase Report', icon: Truck },
          { id: 'STOCK', label: 'Stock Valuation', icon: Store },
          { id: 'MOVEMENTS', label: 'Stock Movements Audit', icon: ArrowRightLeft },
          { id: 'PROFIT', label: 'Profit & Loss (P&L)', icon: DollarSign },
          { id: 'STAFF', label: 'Staff Performance', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/20'
                  : 'bg-[#090d16] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 text-xs shadow-lg">
        <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date Filter:
        </span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-blue-500 font-mono transition-colors"
        />
        <span className="text-slate-500 font-bold">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-blue-500 font-mono transition-colors"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-2 active:scale-95"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Report View Panel */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden p-5">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Generating report data...</div>
        ) : (
          <>
            {/* 1. SALES REPORT */}
            {activeTab === 'SALES' && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily & Monthly Sales Summary</h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-center">Bills Count</th>
                      <th className="py-2.5 px-3 text-right">Cash (₹)</th>
                      <th className="py-2.5 px-3 text-right">UPI (₹)</th>
                      <th className="py-2.5 px-3 text-right">Card (₹)</th>
                      <th className="py-2.5 px-3 text-right">Discounts</th>
                      <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {salesReport.summary.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-500">No sales recorded in this period.</td></tr>
                    ) : (
                      salesReport.summary.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-mono font-bold text-white">{r.period}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">{r.total_bills}</td>
                          <td className="py-3 px-3 text-right font-mono text-blue-400 font-bold">₹{parseFloat(r.cash_sales).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-cyan-400 font-bold">₹{parseFloat(r.upi_sales).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-indigo-400 font-bold">₹{parseFloat(r.card_sales).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">-₹{parseFloat(r.total_discount).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-blue-300">₹{parseFloat(r.total_sales).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. PURCHASE REPORT */}
            {activeTab === 'PURCHASE' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Total Purchases</span>
                    <p className="text-xl font-black text-blue-400 font-mono mt-0.5">₹{(purchaseReport.summary?.totalPurchases || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Total Physical Units Received</span>
                    <p className="text-xl font-black text-white font-mono mt-0.5">{purchaseReport.summary?.totalUnits || 0} Units</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                      <th className="py-2.5 px-3">Purchase #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3 text-center">Units</th>
                      <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {purchaseReport.purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-blue-400">{p.purchase_number}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{p.purchase_date}</td>
                        <td className="py-3 px-3 font-bold text-white">{p.supplier_name}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">{p.total_quantity}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">₹{parseFloat(p.grand_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. STOCK VALUATION REPORT */}
            {activeTab === 'STOCK' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Showroom Stock Valuation</span>
                    <p className="text-xl font-black text-blue-400 font-mono mt-0.5">₹{(stockReport.summary?.totalShowroomValue || 0).toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">{stockReport.summary?.totalShowroomUnits || 0} Units on floor</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Warehouse Stock Valuation</span>
                    <p className="text-xl font-black text-amber-400 font-mono mt-0.5">₹{(stockReport.summary?.totalWarehouseValue || 0).toFixed(2)}</p>
                    <span className="text-[10px] text-slate-400">{stockReport.summary?.totalWarehouseUnits || 0} Units in storage</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[10px]">Total Combined Inventory Value</span>
                    <p className="text-xl font-black text-white font-mono mt-0.5">₹{(stockReport.summary?.totalInventoryValue || 0).toFixed(2)}</p>
                    <span className="text-[10px] text-rose-400 font-bold">{stockReport.summary?.lowStockCount || 0} Items below reorder level</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Showroom Units</th>
                      <th className="py-2.5 px-3 text-center">Warehouse Units</th>
                      <th className="py-2.5 px-3 text-right">Cost Price (₹)</th>
                      <th className="py-2.5 px-3 text-right">Selling Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {stockReport.stockItems.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-blue-400">{s.sku}</td>
                        <td className="py-3 px-3 font-bold text-white">{s.name}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-400">{s.showroom_units}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">{s.warehouse_units}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{parseFloat(s.purchase_price).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">₹{parseFloat(s.selling_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. STOCK MOVEMENTS LEDGER */}
            {activeTab === 'MOVEMENTS' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Traceable Physical Unit Movement Audit Trail
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Movement</th>
                      <th className="py-2.5 px-3">From</th>
                      <th className="py-2.5 px-3">To</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {movementReport.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{m.movement_date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-400">{m.barcode}</td>
                        <td className="py-3 px-3 text-white font-bold">{m.product_name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.movement_type === 'SALE' ? 'bg-blue-500/10 text-blue-400' :
                            m.movement_type === 'TRANSFER_OUT' ? 'bg-sky-500/10 text-sky-400' :
                            m.movement_type === 'RETURN' ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{m.from_location_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-300">{m.to_location_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-400">{m.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. PROFIT & LOSS REPORT */}
            {activeTab === 'PROFIT' && profitReport && (
              <div className="space-y-6 max-w-2xl mx-auto p-4">
                <div className="text-center pb-4 border-b border-slate-800">
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Income Statement (Profit & Loss)</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Period: {profitReport.period?.start} to {profitReport.period?.end}</p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Revenue */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-white uppercase text-[11px] pb-1 border-b border-slate-800">
                      <span>1. Operating Revenue</span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Gross Sales Revenue:</span>
                      <span className="font-mono">₹{(profitReport.revenue?.grossSales || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400 pl-4">
                      <span>Less: Sales Returns & Refunds:</span>
                      <span className="font-mono">-₹{(profitReport.revenue?.totalRefunds || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-300 pl-2 pt-1 border-t border-slate-800/60">
                      <span>Net Revenue:</span>
                      <span className="font-mono font-bold">₹{(profitReport.revenue?.adjustedRevenue || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* COGS */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-white uppercase text-[11px] pb-1 border-b border-slate-800">
                      <span>2. Cost of Goods Sold (COGS)</span>
                    </div>
                    <div className="flex justify-between text-slate-300 pl-4">
                      <span>Total Product Unit Cost of Sold Items:</span>
                      <span className="font-mono text-slate-400">-₹{(profitReport.costOfGoodsSold || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pl-2 pt-1 border-t border-slate-800/60 text-sm">
                      <span>GROSS PROFIT:</span>
                      <span className="font-mono text-blue-400">₹{(profitReport.grossProfit || 0).toFixed(2)} ({profitReport.grossProfitMargin}%)</span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold text-white uppercase text-[11px] pb-1 border-b border-slate-800">
                      <span>3. Operating Expenses</span>
                    </div>
                    {(profitReport.expenses?.breakdown || []).map((exp, idx) => (
                      <div key={idx} className="flex justify-between text-slate-400 pl-4">
                        <span>{exp.category}:</span>
                        <span className="font-mono">₹{parseFloat(exp.total).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-rose-400 pl-2 pt-1 border-t border-slate-800/60">
                      <span>Total Operating Expenses:</span>
                      <span className="font-mono">-₹{(profitReport.expenses?.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="p-4 rounded-2xl bg-slate-950 border-2 border-blue-500/40 flex justify-between items-center text-sm font-black">
                    <span className="text-white uppercase">NET PROFIT / (LOSS):</span>
                    <span className={`font-mono text-xl ${profitReport.netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      ₹{(profitReport.netProfit || 0).toFixed(2)} ({profitReport.netProfitMargin}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. STAFF SALES REPORT */}
            {activeTab === 'STAFF' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cashier & Staff Sales Performance Ledger
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                      <th className="py-2.5 px-3">Staff Name & Email</th>
                      <th className="py-2.5 px-3 text-center">Total Bills</th>
                      <th className="py-2.5 px-3 text-right">Cash (₹)</th>
                      <th className="py-2.5 px-3 text-right">UPI (₹)</th>
                      <th className="py-2.5 px-3 text-right">Card (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {staffReport.staffSales.map((s) => (
                      <tr key={s.user_id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{s.staff_name}</div>
                          <div className="text-[10px] text-slate-500">{s.staff_email}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">{s.total_bills}</td>
                        <td className="py-3 px-3 text-right font-mono text-blue-400">₹{parseFloat(s.cash_sales).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-cyan-400">₹{parseFloat(s.upi_sales).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-indigo-400">₹{parseFloat(s.card_sales).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-white">₹{parseFloat(s.total_sales).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
