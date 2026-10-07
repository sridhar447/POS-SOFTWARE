import React from 'react';

const variantClasses = {
  AVAILABLE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SOLD: 'bg-slate-700/30 text-slate-300 border-slate-700/60',
  RESERVED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  DAMAGED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  RETURNED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  TRANSFERRED: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  ACTIVE: 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-bold',
  INACTIVE: 'bg-slate-800 text-slate-400 border-slate-700',
  PAID: 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-bold',
  PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  UNPAID: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  SHOWROOM: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  WAREHOUSE: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  ADMIN: 'bg-blue-600/20 text-blue-300 border-blue-500/30 font-bold',
  BILLING_USER: 'bg-slate-800 text-slate-200 border-slate-700 font-bold'
};

export const Badge = ({ status, text, className = '' }) => {
  const label = text || status;
  const colorClass = variantClasses[status?.toUpperCase()] || 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
