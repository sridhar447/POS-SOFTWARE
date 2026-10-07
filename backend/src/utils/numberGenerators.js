import { query } from '../config/db.js';

/**
 * Generates formatted sequence numbers for invoices, purchases, transfers, etc.
 * Example: INV-2026-000001
 */
export const getNextDocumentNumber = async (type = 'INVOICE') => {
  const currentYear = new Date().getFullYear();
  let prefix = '';
  let table = '';
  let column = '';

  switch (type.toUpperCase()) {
    case 'INVOICE':
    case 'SALE':
      prefix = `INV-${currentYear}-`;
      table = 'sales';
      column = 'invoice_number';
      break;
    case 'PURCHASE':
      prefix = `PUR-${currentYear}-`;
      table = 'purchases';
      column = 'purchase_number';
      break;
    case 'TRANSFER':
      prefix = `TRF-${currentYear}-`;
      table = 'stock_transfers';
      column = 'transfer_number';
      break;
    case 'EXPENSE':
      prefix = `EXP-${currentYear}-`;
      table = 'expenses';
      column = 'expense_number';
      break;
    case 'RETURN':
      prefix = `RET-${currentYear}-`;
      table = 'sales_returns';
      column = 'return_number';
      break;
    default:
      prefix = `DOC-${currentYear}-`;
      table = 'sales';
      column = 'invoice_number';
  }

  const [lastRecord] = await query(
    `SELECT ${column} as lastNum FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSequence = 1;
  if (lastRecord && lastRecord.lastNum) {
    const parts = lastRecord.lastNum.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}${paddedSequence}`;
};
