import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  Warehouse,
  ArrowRightLeft,
  Barcode,
  Truck,
  Users,
  UserCheck,
  Receipt,
  RotateCcw,
  Landmark,
  CreditCard,
  Clock,
  BarChart3,
  ShieldCheck,
  Settings,
  History,
  LogOut,
  Car
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [showroomName, setShowroomName] = useState('VIP CAR DECOR');

  useEffect(() => {
    // Fetch showroom name from settings
    api.get('/settings/config')
      .then((res) => {
        if (res.data?.settings?.showroom_name) {
          setShowroomName(res.data.settings.showroom_name);
        }
      })
      .catch(() => {});

    const handleSettingsUpdate = (e) => {
      if (e.detail?.showroom_name) {
        setShowroomName(e.detail.showroom_name);
      }
    };

    window.addEventListener('showroom-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('showroom-settings-updated', handleSettingsUpdate);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNavSections = [
    {
      title: 'CORE & RETAIL',
      links: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'POS Billing', path: '/billing', icon: ShoppingCart, highlight: true },
        { name: 'Sales & Invoices', path: '/sales', icon: Receipt },
        { name: 'Sales Returns', path: '/returns', icon: RotateCcw }
      ]
    },
    {
      title: 'INVENTORY & LOGISTICS',
      links: [
        { name: 'Products Catalog', path: '/products', icon: Package },
        { name: 'Showroom Stock', path: '/showroom-stock', icon: Store },
        { name: 'Warehouse Stock', path: '/warehouse-stock', icon: Warehouse },
        { name: 'Stock Transfer', path: '/stock-transfer', icon: ArrowRightLeft },
        { name: 'Barcode Center', path: '/barcodes', icon: Barcode },
        { name: 'Purchases & Stock In', path: '/purchases', icon: Truck },
        { name: 'Suppliers', path: '/suppliers', icon: Users },
        { name: 'Customers', path: '/customers', icon: UserCheck }
      ]
    },
    {
      title: 'FINANCE & OPERATIONS',
      links: [
        { name: 'Daily Accounts', path: '/accounts', icon: Landmark },
        { name: 'Expense Tracker', path: '/expenses', icon: CreditCard },
        { name: 'Staff Attendance', path: '/attendance', icon: Clock },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 }
      ]
    },
    {
      title: 'ADMINISTRATION',
      links: [
        { name: 'Staff & Roles', path: '/users', icon: ShieldCheck },
        { name: 'Showroom Settings', path: '/settings', icon: Settings },
        { name: 'Audit Logs', path: '/audit-logs', icon: History }
      ]
    }
  ];

  const billingUserLinks = [
    { name: 'POS Billing', path: '/billing', icon: ShoppingCart, highlight: true },
    { name: 'My Sales History', path: '/sales', icon: Receipt },
    { name: 'Staff Attendance', path: '/attendance', icon: Clock }
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#090d16] border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
          <Car className="w-6 h-6" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-base font-extrabold tracking-wider text-white truncate" title={showroomName}>
            {showroomName}
          </h1>
          <p className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">ERP & POS SYSTEM</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {isAdmin ? (
          adminNavSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{sec.title}</h4>
              {sec.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                        isActive
                          ? link.highlight
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold border border-blue-400/30'
                            : 'bg-slate-800/90 text-blue-400 border border-blue-500/30 shadow-md font-bold'
                          : link.highlight
                          ? 'bg-blue-600/10 text-blue-300 hover:bg-blue-600/20 hover:text-white border border-blue-500/20'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{link.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))
        ) : (
          <div className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">CASHIER CONSOLE</h4>
            {billingUserLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold border border-blue-400/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-blue-400">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wide truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
