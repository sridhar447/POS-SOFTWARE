import { query } from '../config/db.js';

/**
 * Inserts an audit trail record into audit_logs table
 */
export const createAuditLog = async ({
  userId = null,
  role = null,
  action,
  module,
  recordId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  connection = null
}) => {
  try {
    const oldValJson = oldValue ? JSON.stringify(oldValue) : null;
    const newValJson = newValue ? JSON.stringify(newValue) : null;

    const sql = `
      INSERT INTO audit_logs 
      (user_id, role, action, module, record_id, old_value, new_value, ip_address) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [userId, role, action, module, recordId ? String(recordId) : null, oldValJson, newValJson, ipAddress];

    if (connection) {
      await connection.execute(sql, params);
    } else {
      await query(sql, params);
    }
  } catch (error) {
    console.error('⚠️ Failed to record audit log:', error.message);
  }
};
