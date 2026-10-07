import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Store,
  Warehouse,
  AlertTriangle,
  Truck,
  Landmark,
  CreditCard,
  DollarSign,
  Users,
  ArrowRight,
  ArrowRightLeft,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import api from '../services/api';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#38bdf8', '#818cf8', '#4f46e5'];

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get(`/dashboard/charts?range=${range}`)
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-8">
      {/* Header with Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">EXECUTIVE DASHBOARD</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time Showroom & Warehouse Operations Overview</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {['7d', '30d', '90d', '1y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                range === r
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold border border-blue-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '3 Months' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid 1: Sales & Revenue */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Sales & Revenue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Today's Retail Sales"
            value={`₹${(s.sales?.today || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`${s.sales?.todayCount || 0} bills completed today`}
            icon={ShoppingCart}
            color="blue"
          />
          <StatCard
            title="Monthly Sales (This Month)"
            value={`₹${(s.sales?.monthly || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`${s.sales?.monthlyCount || 0} bills this month`}
            icon={TrendingUp}
            color="indigo"
          />
          <StatCard
            title="Total Cumulative Sales"
            value={`₹${(s.sales?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`${s.sales?.totalCount || 0} lifetime invoices`}
            icon={Landmark}
            color="sky"
          />
        </div>
      </div>

      {/* KPI Stats Grid 2: Dual Stock & Logistics */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          2. Inventory Distribution (Showroom vs Warehouse)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Showroom Stock"
            value={`${s.stock?.showroom || 0} Units`}
            subtitle="Available for direct POS billing"
            icon={Store}
            color="cyan"
          />
          <StatCard
            title="Warehouse Stock"
            value={`${s.stock?.warehouse || 0} Units`}
            subtitle="Protected from billing until transferred"
            icon={Warehouse}
            color="amber"
          />
          <StatCard
            title="Low Stock Alerts"
            value={`${s.stock?.lowStock || 0}`}
            subtitle="Showroom units <= Reorder Level"
            icon={AlertTriangle}
            color="rose"
          />
          <StatCard
            title="Out of Stock"
            value={`${s.stock?.outOfStock || 0}`}
            subtitle="Zero available units in showroom"
            icon={AlertTriangle}
            color="rose"
          />
        </div>
      </div>

      {/* KPI Stats Grid 3: Accounts, Purchases & Staff */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          3. Purchases, Financial Ledger & Staff Attendance
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Purchases"
            value={`₹${(s.purchases?.today || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`Monthly: ₹${(s.purchases?.monthly || 0).toLocaleString('en-IN')}`}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Today's Expenses"
            value={`₹${(s.accounts?.todayExpense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Operating showroom costs"
            icon={CreditCard}
            color="rose"
          />
          <StatCard
            title="Today's Net Profit"
            value={`₹${(s.accounts?.todayNetProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle={`Gross Profit: ₹${(s.accounts?.todayGrossProfit || 0).toLocaleString('en-IN')}`}
            icon={DollarSign}
            color={s.accounts?.todayNetProfit >= 0 ? 'blue' : 'rose'}
          />
          <StatCard
            title="Staff Attendance"
            value={`${s.staff?.present || 0} Present`}
            subtitle={`${s.staff?.absent || 0} Absent / Off today`}
            icon={Users}
            color="indigo"
          />
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Daily Sales Trend</h4>
            <span className="text-xs font-mono text-blue-400 font-bold">₹ Sales vs Date</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.dailySales || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  formatter={(val) => [`₹${parseFloat(val).toFixed(2)}`, 'Sales Total']}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Comparison: Showroom vs Warehouse by Category */}
        <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Showroom vs Warehouse Stock</h4>
            <span className="text-xs text-slate-400">Unit Distribution</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.stockDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="showroom_stock" name="Showroom Stock (Ready)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="warehouse_stock" name="Warehouse Stock (Storage)" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Share */}
        <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Category Revenue Contribution</h4>
            <span className="text-xs text-slate-400">Top Categories</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.categorySales || []}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  fontSize={10}
                >
                  {(charts?.categorySales || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Split */}
        <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Payment Method Distribution</h4>
            <span className="text-xs text-slate-400">Cash vs UPI vs Card</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.paymentDistribution || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="payment_method" type="category" stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  formatter={(val) => [`₹${parseFloat(val).toFixed(2)}`, 'Amount']}
                />
                <Bar dataKey="amount" name="Amount (₹)" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Fast Replenishment Widget */}
      <div className="rounded-3xl bg-[#090d16] border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Showroom Low Stock Alerts
              </h4>
              <p className="text-xs text-slate-400">
                Products reaching or below reorder threshold on showroom floor
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/stock-transfer')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Initiate Stock Transfer</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Showroom Available</th>
                <th className="py-2.5 px-3 text-center">Warehouse Backup</th>
                <th className="py-2.5 px-3 text-center">Reorder Level</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {(charts?.lowStockAlerts || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    All showroom products are currently well-stocked above reorder levels.
                  </td>
                </tr>
              ) : (
                (charts?.lowStockAlerts || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{item.name}</td>
                    <td className="py-3 px-3 font-mono text-blue-400">{item.sku}</td>
                    <td className="py-3 px-3 text-slate-400">{item.category}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        {item.showroom_units} Units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {item.warehouse_units} Units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{item.reorder_level}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate('/stock-transfer', { state: { product_id: item.id } })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 border border-blue-400/30"
                      >
                        <span>Transfer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
