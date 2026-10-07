import React, { useState, useEffect } from 'react';
import { Menu, Clock, ShoppingCart, LogOut, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isAdmin } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockToggle = async () => {
    setClockLoading(true);
    try {
      if (!clockedIn) {
        const res = await api.post('/attendance/clock-in');
        setClockedIn(true);
        success(res.message || 'Clocked in successfully.');
      } else {
        const res = await api.post('/attendance/clock-out');
        setClockedIn(false);
        success(res.message || 'Clocked out successfully.');
      }
    } catch (err) {
      error(err.message || 'Attendance action failed.');
    } finally {
      setClockLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#090d16]/90 px-4 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>VIP CAR DECOR &bull; <strong className="text-white font-mono">COUNTER-01</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-medium text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{time}</span>
        </div>

        {/* Quick Attendance Clock In/Out */}
        <button
          onClick={handleClockToggle}
          disabled={clockLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
            clockedIn
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{clockedIn ? 'Clock Out' : 'Clock In'}</span>
        </button>

        {/* Fast POS Switch Button */}
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">OPEN POS BILLING</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-white leading-tight">{user?.name}</p>
            <p className="text-[10px] text-blue-400 font-semibold">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
