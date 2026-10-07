import { query } from '../config/db.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getProducts = async (req, res, next) => {
  try {
    const { category_id, brand_id, search, status, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT p.*, 
             c.name as category_name, 
             b.name as brand_name,
             COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as showroom_stock,
             COUNT(CASE WHEN u.location_id = 2 AND u.status = 'AVAILABLE' THEN 1 END) as warehouse_stock,
             COUNT(CASE WHEN u.status = 'SOLD' THEN 1 END) as total_sold
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_units u ON p.id = u.product_id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (brand_id) {
      sql += ' AND p.brand_id = ?';
      params.push(brand_id);
    }
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' GROUP BY p.id ORDER BY p.id DESC';

    // Pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const products = await query(sql, params);

    // Count total products
    let countSql = 'SELECT COUNT(*) as total FROM products p WHERE 1=1';
    const countParams = [];
    if (category_id) {
      countSql += ' AND p.category_id = ?';
      countParams.push(category_id);
    }
    if (brand_id) {
      countSql += ' AND p.brand_id = ?';
      countParams.push(brand_id);
    }
    if (status) {
      countSql += ' AND p.status = ?';
      countParams.push(status);
    }
    if (search) {
      countSql += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      countParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [countResult] = await query(countSql, countParams);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total: countResult ? countResult.total : products.length,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [product] = await query(
      `SELECT p.*, c.name as category_name, b.name as brand_name,
              COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as showroom_stock,
              COUNT(CASE WHEN u.location_id = 2 AND u.status = 'AVAILABLE' THEN 1 END) as warehouse_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN product_units u ON p.id = u.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Fetch individual units
    const units = await query(
      `SELECT u.*, l.name as location_name 
       FROM product_units u
       JOIN stock_locations l ON u.location_id = l.id
       WHERE u.product_id = ?
       ORDER BY u.id DESC`,
      [id]
    );

    res.json({
      success: true,
      data: { product, units }
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      category_id,
      brand_id,
      description,
      size,
      color,
      purchase_price,
      selling_price,
      tax_percent,
      discount_percent,
      reorder_level,
      status
    } = req.body;

    if (!sku || !name || selling_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'SKU, Product Name, and Selling Price are required.',
        code: 'MISSING_FIELDS'
      });
    }

    // Check SKU duplicate
    const [existing] = await query('SELECT id FROM products WHERE sku = ?', [sku.trim()]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Product with SKU "${sku.trim()}" already exists.`,
        code: 'DUPLICATE_SKU'
      });
    }

    const result = await query(
      `INSERT INTO products 
       (sku, name, category_id, brand_id, description, size, color, purchase_price, selling_price, tax_percent, discount_percent, reorder_level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sku.trim().toUpperCase(),
        name.trim(),
        category_id || null,
        brand_id || null,
        description || null,
        size || null,
        color || null,
        parseFloat(purchase_price) || 0.00,
        parseFloat(selling_price) || 0.00,
        parseFloat(tax_percent) || 0.00,
        parseFloat(discount_percent) || 0.00,
        parseInt(reorder_level, 10) || 5,
        status || 'ACTIVE'
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'PRODUCT_CREATED',
      module: 'PRODUCTS',
      recordId: result.insertId,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [oldProduct] = await query('SELECT * FROM products WHERE id = ?', [id]);
    
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    const {
      sku,
      name,
      category_id,
      brand_id,
      description,
      size,
      color,
      purchase_price,
      selling_price,
      tax_percent,
      discount_percent,
      reorder_level,
      status
    } = req.body;

    // Check SKU uniqueness if changing SKU
    if (sku && sku.trim().toUpperCase() !== oldProduct.sku) {
      const [duplicate] = await query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku.trim().toUpperCase(), id]);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `SKU "${sku.trim()}" is already assigned to another product.`,
          code: 'DUPLICATE_SKU'
        });
      }
    }

    await query(
      `UPDATE products SET 
       sku = ?, name = ?, category_id = ?, brand_id = ?, description = ?, size = ?, color = ?,
       purchase_price = ?, selling_price = ?, tax_percent = ?, discount_percent = ?, reorder_level = ?, status = ?
       WHERE id = ?`,
      [
        sku ? sku.trim().toUpperCase() : oldProduct.sku,
        name ? name.trim() : oldProduct.name,
        category_id !== undefined ? category_id : oldProduct.category_id,
        brand_id !== undefined ? brand_id : oldProduct.brand_id,
        description !== undefined ? description : oldProduct.description,
        size !== undefined ? size : oldProduct.size,
        color !== undefined ? color : oldProduct.color,
        purchase_price !== undefined ? parseFloat(purchase_price) : oldProduct.purchase_price,
        selling_price !== undefined ? parseFloat(selling_price) : oldProduct.selling_price,
        tax_percent !== undefined ? parseFloat(tax_percent) : oldProduct.tax_percent,
        discount_percent !== undefined ? parseFloat(discount_percent) : oldProduct.discount_percent,
        reorder_level !== undefined ? parseInt(reorder_level, 10) : oldProduct.reorder_level,
        status || oldProduct.status,
        id
      ]
    );

    // Audit log price change specifically if price changed
    if (selling_price !== undefined && parseFloat(selling_price) !== parseFloat(oldProduct.selling_price)) {
      await createAuditLog({
        userId: req.user.id,
        role: req.user.role,
        action: 'PRICE_CHANGED',
        module: 'PRODUCTS',
        recordId: id,
        oldValue: { selling_price: oldProduct.selling_price },
        newValue: { selling_price: parseFloat(selling_price) },
        ipAddress: req.ip
      });
    }

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'PRODUCT_UPDATED',
      module: 'PRODUCTS',
      recordId: id,
      oldValue: oldProduct,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Product updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft deactivation to maintain relational transaction integrity
    const [product] = await query('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    await query("UPDATE products SET status = 'INACTIVE' WHERE id = ?", [id]);

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'PRODUCT_DEACTIVATED',
      module: 'PRODUCTS',
      recordId: id,
      oldValue: { status: product.status },
      newValue: { status: 'INACTIVE' },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Product deactivated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const result = await query(
      'INSERT INTO categories (name, code, description) VALUES (?, ?, ?)',
      [name.trim(), code ? code.trim() : null, description || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    next(error);
  }
};

export const getBrands = async (req, res, next) => {
  try {
    const brands = await query('SELECT * FROM brands ORDER BY name ASC');
    res.json({ success: true, data: { brands } });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Brand name is required.' });
    }
    const result = await query(
      'INSERT INTO brands (name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    next(error);
  }
};
