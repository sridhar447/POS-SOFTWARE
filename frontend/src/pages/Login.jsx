import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Lock, User, ArrowRight, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) return;

    setLoading(true);
    try {
      const user = await login(emailOrUsername, password);
      success(`Welcome back, ${user.name}!`);
      if (user.role === 'ADMIN') {
        navigate('/dashboard');
      } else {
        navigate('/billing');
      }
    } catch (err) {
      error(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') {
      setEmailOrUsername('admin@example.com');
      setPassword('Admin@123');
    } else {
      setEmailOrUsername('billing@example.com');
      setPassword('Billing@123');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#06090e] p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-slate-800 shadow-2xl p-8 backdrop-blur-xl">
        {/* Brand Banner */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-2">
            <Car className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">VIP CAR DECOR</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
            ERP &bull; POS &bull; INVENTORY &bull; WAREHOUSE
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Username or Email
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to System'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Account Pills */}
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Quick Demo Credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left transition-all active:scale-95 group"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white group-hover:text-blue-300">Admin Account</p>
                <p className="text-[9px] text-slate-400 font-mono truncate">Admin@123</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('billing')}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left transition-all active:scale-95 group"
            >
              <ShoppingCart className="w-4 h-4 text-sky-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white group-hover:text-blue-300">Cashier Console</p>
                <p className="text-[9px] text-slate-400 font-mono truncate">Billing@123</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
