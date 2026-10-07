import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const clockIn = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8); // 'HH:MM:SS'

    // Check if already clocked in today
    const [existing] = await query(
      'SELECT id, login_time FROM attendance WHERE user_id = ? AND date = ?',
      [req.user.id, today]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You have already clocked in today at ${existing.login_time}.`,
        code: 'ALREADY_CLOCKED_IN'
      });
    }

    await query(
      "INSERT INTO attendance (user_id, date, login_time, status) VALUES (?, ?, ?, 'Present')",
      [req.user.id, today, nowTime]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'CLOCK_IN',
      module: 'ATTENDANCE',
      recordId: req.user.id,
      newValue: { date: today, time: nowTime },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Clocked in successfully at ${nowTime}.`,
      data: { date: today, login_time: nowTime }
    });
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const [record] = await query(
      'SELECT id, login_time FROM attendance WHERE user_id = ? AND date = ?',
      [req.user.id, today]
    );

    if (!record || !record.login_time) {
      return res.status(400).json({
        success: false,
        message: 'No clock-in record found for today.',
        code: 'NOT_CLOCKED_IN'
      });
    }

    // Calculate hours
    const loginParts = record.login_time.split(':').map(Number);
    const logoutParts = nowTime.split(':').map(Number);

    const loginMins = loginParts[0] * 60 + loginParts[1];
    const logoutMins = logoutParts[0] * 60 + logoutParts[1];
    const diffHours = Math.max(0, (logoutMins - loginMins) / 60);

    await query(
      'UPDATE attendance SET logout_time = ?, working_hours = ? WHERE id = ?',
      [nowTime, diffHours.toFixed(2), record.id]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'CLOCK_OUT',
      module: 'ATTENDANCE',
      recordId: req.user.id,
      newValue: { date: today, logout_time: nowTime, hours: diffHours.toFixed(2) },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Clocked out at ${nowTime}. Working hours: ${diffHours.toFixed(2)} hrs.`,
      data: { logout_time: nowTime, working_hours: diffHours.toFixed(2) }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const { start_date, end_date, user_id, status } = req.query;

    let sql = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Billing user only sees their own attendance unless admin
    if (req.user.role === 'BILLING_USER') {
      sql += ' AND a.user_id = ?';
      params.push(req.user.id);
    } else if (user_id) {
      sql += ' AND a.user_id = ?';
      params.push(user_id);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (start_date) {
      sql += ' AND a.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND a.date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY a.date DESC, a.id DESC';

    const records = await query(sql, params);

    res.json({
      success: true,
      data: { attendance: records }
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendanceAdmin = async (req, res, next) => {
  try {
    const { user_id, date, login_time, logout_time, status, notes } = req.body;

    if (!user_id || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'User, Date, and Status are required.',
        code: 'MISSING_FIELDS'
      });
    }

    let workingHours = 0;
    if (login_time && logout_time) {
      const loginParts = login_time.split(':').map(Number);
      const logoutParts = logout_time.split(':').map(Number);
      const diffMins = (logoutParts[0] * 60 + logoutParts[1]) - (loginParts[0] * 60 + loginParts[1]);
      workingHours = Math.max(0, diffMins / 60);
    }

    await query(
      `INSERT INTO attendance (user_id, date, login_time, logout_time, working_hours, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       login_time = VALUES(login_time),
       logout_time = VALUES(logout_time),
       working_hours = VALUES(working_hours),
       status = VALUES(status),
       notes = VALUES(notes)`,
      [
        user_id,
        date,
        login_time || null,
        logout_time || null,
        workingHours.toFixed(2),
        status,
        notes || null
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'ADMIN_ATTENDANCE_MARKED',
      module: 'ATTENDANCE',
      recordId: user_id,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Attendance record updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};
