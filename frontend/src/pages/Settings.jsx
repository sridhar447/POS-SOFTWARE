import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Store, Receipt, Barcode, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const Settings = () => {
  const { success, error } = useToast();
  const [settings, setSettings] = useState({
    showroom_name: 'VIP CAR DECOR',
    showroom_address: '104 Boulevard Avenue, Chennai, TN - 600001',
    showroom_phone: '+91 98765 43210',
    showroom_email: 'contact@vipcardecor.com',
    gst_number: '33ABCDE1234F1Z5',
    invoice_prefix: 'INV-2026-',
    purchase_prefix: 'PUR-2026-',
    transfer_prefix: 'TRF-2026-',
    barcode_prefix: 'SH-',
    currency_symbol: '₹',
    default_tax_percent: '12.00',
    default_reorder_level: '5',
    invoice_footer: 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with original receipt and barcode tags intact.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/config');
      if (res.data?.settings) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      error(err.message || 'Failed to load showroom settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/config', settings);
      window.dispatchEvent(new CustomEvent('showroom-settings-updated', { detail: settings }));
      success('Showroom configurations saved successfully!');
    } catch (err) {
      error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-blue-400" />
          <span>SHOWROOM SYSTEM CONFIGURATION</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Store identity, GST tax parameters, invoice sequence formats, and barcode prefixes
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
            <Store className="w-4 h-4 text-blue-400" />
            <span>Showroom Identity & Contact</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Showroom / Store Name</label>
              <input
                type="text"
                required
                value={settings.showroom_name}
                onChange={(e) => setSettings({ ...settings, showroom_name: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.gst_number}
                onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-mono text-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.showroom_phone}
                onChange={(e) => setSettings({ ...settings, showroom_phone: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                value={settings.showroom_email}
                onChange={(e) => setSettings({ ...settings, showroom_email: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Physical Store Address</label>
            <textarea
              rows={2}
              value={settings.showroom_address}
              onChange={(e) => setSettings({ ...settings, showroom_address: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Invoice & Barcode Prefixes */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
            <Receipt className="w-4 h-4 text-blue-400" />
            <span>Document Sequence Prefixes & Barcodes</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Barcode Prefix</label>
              <input
                type="text"
                value={settings.barcode_prefix}
                onChange={(e) => setSettings({ ...settings, barcode_prefix: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reorder Level</label>
              <input
                type="number"
                value={settings.default_reorder_level}
                onChange={(e) => setSettings({ ...settings, default_reorder_level: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Invoice Receipt Footer Note</label>
            <textarea
              rows={2}
              value={settings.invoice_footer}
              onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Configurations...' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
