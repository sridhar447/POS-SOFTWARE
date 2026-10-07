import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#06090e]/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-[#0b101d] border border-slate-700 shadow-2xl p-6 z-10">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${danger ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-300">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 ${
              danger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
