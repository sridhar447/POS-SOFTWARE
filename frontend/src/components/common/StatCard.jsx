import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-600/5 text-blue-400 border-blue-500/25',
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300 border-cyan-500/25',
    indigo: 'from-indigo-600/20 to-indigo-600/5 text-indigo-300 border-indigo-500/25',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/25',
    emerald: 'from-blue-600/20 to-blue-600/5 text-blue-400 border-blue-500/25',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#090d16]/90 ${selectedColor} border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-blue-500/50`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-white font-mono">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              {trend && (
                <span className={trend > 0 ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>
                  {trend > 0 ? `+${trend}%` : `${trend}%`}
                </span>
              )}
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 shadow-inner text-blue-400">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
