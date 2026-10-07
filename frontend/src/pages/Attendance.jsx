import React, { useState, useEffect } from 'react';
import { Clock, Plus, Search, CheckCircle2, UserCheck, Calendar, Filter } from 'lucide-react';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Attendance = () => {
  const { success, error } = useToast();
  const { user, isAdmin } = useAuth();

  const [records, setRecords] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin Mark Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: new Date().toISOString().slice(0, 10),
    login_time: '09:30:00',
    logout_time: '18:30:00',
    status: 'Present',
    notes: ''
  });

  useEffect(() => {
    fetchMetadata();
    fetchAttendance();
  }, [selectedDate, selectedUserId]);

  const fetchMetadata = async () => {
    if (isAdmin) {
      try {
        const res = await api.get('/settings/users');
        setStaffUsers(res.data?.users || []);
        if (res.data?.users?.length > 0) {
          setFormData(prev => ({ ...prev, user_id: res.data.users[0].id }));
        }
      } catch (e) {}
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('start_date', selectedDate);
      if (selectedUserId) params.append('user_id', selectedUserId);

      const res = await api.get(`/attendance?${params.toString()}`);
      setRecords(res.data?.attendance || []);
    } catch (err) {
      error(err.message || 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminMark = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/admin-mark', formData);
      success('Attendance updated successfully.');
      setIsModalOpen(false);
      fetchAttendance();
    } catch (err) {
      error(err.message || 'Failed to update attendance.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-400" />
            <span>STAFF ATTENDANCE & SHIFTS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cashier & showroom staff duty roster, biometric timesheet, and duty hours
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Mark / Adjust Attendance</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-lg">
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
            placeholder="Filter Date"
          />
        </div>

        {isAdmin && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All Employees</option>
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        )}
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Clock In Time</th>
                <th className="py-3 px-4 text-center">Clock Out Time</th>
                <th className="py-3 px-4 text-center">Working Hours</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading attendance register...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No attendance entries found.</td></tr>
              ) : (
                records.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{a.user_name}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{a.user_role}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{a.date}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-400">
                      {a.login_time || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                      {a.logout_time || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">
                      {a.working_hours ? `${parseFloat(a.working_hours).toFixed(2)} hrs` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'Present'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : a.status === 'Absent'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{a.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Manual Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Admin Attendance Register Entry"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdminMark} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Select Employee *</label>
            <select
              required
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            >
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Duty Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">On Leave</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Clock In Time</label>
              <input
                type="text"
                value={formData.login_time}
                onChange={(e) => setFormData({ ...formData, login_time: e.target.value })}
                placeholder="09:30:00"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Clock Out Time</label>
              <input
                type="text"
                value={formData.logout_time}
                onChange={(e) => setFormData({ ...formData, logout_time: e.target.value })}
                placeholder="18:30:00"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Notes / Reason</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Shift adjustment remarks..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 active:scale-95 transition-all"
            >
              Save Attendance Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
