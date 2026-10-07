import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, Eye } from 'lucide-react';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export const AuditLogs = () => {
  const { error } = useToast();
  const [logs, setLogs] = useState([]);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [moduleFilter, actionFilter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/settings/audit-logs?${params.toString()}`);
      setLogs(res.data?.logs || []);
    } catch (err) {
      error(err.message || 'Failed to fetch audit trails.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
          <History className="w-6 h-6 text-blue-400" />
          <span>SECURITY & BUSINESS AUDIT TRAILS</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event ledger tracking price revisions, stock adjustments, financial settlements, and user logins
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Business Modules</option>
          <option value="AUTH">AUTH & Logins</option>
          <option value="PRODUCTS">PRODUCTS & Prices</option>
          <option value="INVENTORY">INVENTORY Adjustments</option>
          <option value="TRANSFER">STOCK TRANSFERS</option>
          <option value="PURCHASE">PURCHASES</option>
          <option value="POS">POS RETAIL SALES</option>
          <option value="RETURNS">SALES RETURNS</option>
          <option value="ACCOUNTS">ACCOUNTS & EXPENSES</option>
          <option value="SETTINGS">SETTINGS</option>
          <option value="USERS">USERS</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN">LOGIN</option>
          <option value="PRICE_CHANGED">PRICE_CHANGED</option>
          <option value="PRODUCT_CREATED">PRODUCT_CREATED</option>
          <option value="PRODUCT_UPDATED">PRODUCT_UPDATED</option>
          <option value="PRODUCT_DEACTIVATED">PRODUCT_DEACTIVATED</option>
          <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
          <option value="STOCK_TRANSFERRED">STOCK_TRANSFERRED</option>
          <option value="PURCHASE_CREATED">PURCHASE_CREATED</option>
          <option value="SALE_COMPLETED">SALE_COMPLETED</option>
          <option value="SALE_RETURN_PROCESSED">SALE_RETURN_PROCESSED</option>
          <option value="EXPENSE_CREATED">EXPENSE_CREATED</option>
          <option value="DAILY_CLOSING_SUBMITTED">DAILY_CLOSING_SUBMITTED</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4 font-mono">Record ID / Ref</th>
                <th className="py-3 px-4 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading audit trail...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No audit events match filters.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.created_at}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{log.user_name || 'System'}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{log.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-blue-400 font-mono">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold font-mono text-[11px] ${
                        log.action.includes('PRICE') ? 'text-amber-400' :
                        log.action.includes('SALE') ? 'text-blue-400' :
                        log.action.includes('DELETE') || log.action.includes('DEACTIVATE') ? 'text-rose-400' :
                        'text-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 font-bold">{log.record_id || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 text-xs font-semibold transition-colors active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Audit Event: ${selectedLog?.action}`}
        subtitle={`Module: ${selectedLog?.module} | Time: ${selectedLog?.created_at}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Triggered User:</span>
              <span className="font-bold text-white">{selectedLog?.user_name} ({selectedLog?.role})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Record Reference:</span>
              <span className="font-mono font-bold text-blue-400">{selectedLog?.record_id || 'N/A'}</span>
            </div>
          </div>

          {selectedLog?.old_value && (
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Previous / Old State</span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto">
                {typeof selectedLog.old_value === 'string' ? selectedLog.old_value : JSON.stringify(selectedLog.old_value, null, 2)}
              </pre>
            </div>
          )}

          {selectedLog?.new_value && (
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">Updated / New Payload</span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-blue-300 overflow-x-auto">
                {typeof selectedLog.new_value === 'string' ? selectedLog.new_value : JSON.stringify(selectedLog.new_value, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogs;
