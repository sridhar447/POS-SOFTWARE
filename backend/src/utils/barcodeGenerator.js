import crypto from 'crypto';
import { query } from '../config/db.js';

const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing 0, 1, O, I

/**
 * Generates a unique random alphanumeric barcode formatted like: SH-8F42K91
 * @param {string} prefix 
 * @param {number} length 
 * @returns {string}
 */
export const generateSingleBarcodeString = (prefix = 'SH-', length = 7) => {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return `${prefix}${result}`;
};

/**
 * Generates N unique barcodes that are guaranteed not to exist in the database
 * @param {number} count 
 * @param {string} prefix 
 * @returns {Promise<string[]>}
 */
export const generateUniqueBarcodes = async (count = 1, prefix = 'SH-') => {
  const generated = new Set();
  
  while (generated.size < count) {
    const candidate = generateSingleBarcodeString(prefix, 7);
    generated.add(candidate);
  }

  const barcodeList = Array.from(generated);
  
  // Check against database to ensure absolute zero collision
  const placeholders = barcodeList.map(() => '?').join(',');
  const existing = await query(
    `SELECT barcode FROM product_units WHERE barcode IN (${placeholders})`,
    barcodeList
  );

  if (existing.length === 0) {
    return barcodeList;
  }

  // If any collided with existing DB records, filter out and regenerate the difference
  const existingSet = new Set(existing.map(r => r.barcode));
  const validBarcodes = barcodeList.filter(b => !existingSet.has(b));
  
  const additionalNeeded = count - validBarcodes.length;
  if (additionalNeeded > 0) {
    const additional = await generateUniqueBarcodes(additionalNeeded, prefix);
    return [...validBarcodes, ...additional];
  }

  return validBarcodes;
};
