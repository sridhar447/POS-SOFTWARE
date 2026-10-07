import { query } from '../config/db.js';

export const getSalesReport = async (req, res, next) => {
  try {
    const { start_date, end_date, cashier_id, payment_method, group_by = 'daily' } = req.query;

    let dateFormat = '%Y-%m-%d';
    if (group_by === 'monthly') dateFormat = '%Y-%m';
    else if (group_by === 'yearly') dateFormat = '%Y';

    let sql = `
      SELECT DATE_FORMAT(s.sale_date, '${dateFormat}') as period,
             COUNT(s.id) as total_bills,
             COALESCE(SUM(s.subtotal), 0) as total_subtotal,
             COALESCE(SUM(s.discount_amount), 0) as total_discount,
             COALESCE(SUM(s.tax_amount), 0) as total_tax,
             COALESCE(SUM(s.grand_total), 0) as total_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'CASH' THEN s.grand_total ELSE 0 END), 0) as cash_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'UPI' THEN s.grand_total ELSE 0 END), 0) as upi_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'CARD' THEN s.grand_total ELSE 0 END), 0) as card_sales,
             COALESCE(SUM(CASE WHEN s.payment_method NOT IN ('CASH', 'UPI', 'CARD') THEN s.grand_total ELSE 0 END), 0) as other_sales
      FROM sales s
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND s.sale_date <= ?';
      params.push(end_date);
    }
    if (cashier_id) {
      sql += ' AND s.cashier_id = ?';
      params.push(cashier_id);
    }
    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    sql += ` GROUP BY period ORDER BY period DESC`;

    const summary = await query(sql, params);

    // Top selling products in date range
    let topProductsSql = `
      SELECT p.name as product_name, p.sku, c.name as category_name,
             COUNT(si.id) as units_sold,
             COALESCE(SUM(si.line_total), 0) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE 1=1
    `;
    const topParams = [];
    if (start_date) {
      topProductsSql += ' AND s.sale_date >= ?';
      topParams.push(start_date);
    }
    if (end_date) {
      topProductsSql += ' AND s.sale_date <= ?';
      topParams.push(end_date);
    }
    topProductsSql += ' GROUP BY p.id, p.name, p.sku, c.name ORDER BY units_sold DESC LIMIT 10';

    const topProducts = await query(topProductsSql, topParams);

    res.json({
      success: true,
      data: { summary, topProducts }
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseReport = async (req, res, next) => {
  try {
    const { start_date, end_date, supplier_id } = req.query;

    let sql = `
      SELECT p.*, s.name as supplier_name,
             COUNT(pi.id) as item_types_count,
             SUM(pi.quantity) as total_quantity
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND p.purchase_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND p.purchase_date <= ?';
      params.push(end_date);
    }
    if (supplier_id) {
      sql += ' AND p.supplier_id = ?';
      params.push(supplier_id);
    }

    sql += ' GROUP BY p.id ORDER BY p.purchase_date DESC, p.id DESC';

    const purchases = await query(sql, params);

    // Totals
    const totalPurchases = purchases.reduce((acc, p) => acc + parseFloat(p.grand_total || 0), 0);
    const totalUnits = purchases.reduce((acc, p) => acc + parseInt(p.total_quantity || 0, 10), 0);

    res.json({
      success: true,
      data: {
        purchases,
        summary: {
          totalPurchases,
          totalUnits,
          count: purchases.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStockReport = async (req, res, next) => {
  try {
    const { category_id, brand_id } = req.query;

    let sql = `
      SELECT p.id, p.sku, p.name, p.reorder_level, p.purchase_price, p.selling_price,
             c.name as category_name, b.name as brand_name,
             COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as showroom_units,
             COUNT(CASE WHEN u.location_id = 2 AND u.status = 'AVAILABLE' THEN 1 END) as warehouse_units,
             COUNT(CASE WHEN u.status = 'DAMAGED' THEN 1 END) as damaged_units,
             COUNT(CASE WHEN u.status = 'SOLD' THEN 1 END) as sold_units,
             COUNT(CASE WHEN u.status = 'AVAILABLE' THEN 1 END) as total_available
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_units u ON p.id = u.product_id
      WHERE p.status = 'ACTIVE'
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

    sql += ' GROUP BY p.id ORDER BY p.name ASC';

    const stockItems = await query(sql, params);

    // Valuations
    let totalShowroomValue = 0;
    let totalWarehouseValue = 0;
    let lowStockCount = 0;

    for (const item of stockItems) {
      const buyPrice = parseFloat(item.purchase_price || 0);
      totalShowroomValue += item.showroom_units * buyPrice;
      totalWarehouseValue += item.warehouse_units * buyPrice;
      if (item.showroom_units <= item.reorder_level) {
        lowStockCount++;
      }
    }

    res.json({
      success: true,
      data: {
        stockItems,
        summary: {
          totalShowroomUnits: stockItems.reduce((a, b) => a + parseInt(b.showroom_units, 10), 0),
          totalWarehouseUnits: stockItems.reduce((a, b) => a + parseInt(b.warehouse_units, 10), 0),
          totalShowroomValue,
          totalWarehouseValue,
          totalInventoryValue: totalShowroomValue + totalWarehouseValue,
          lowStockCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfitLossReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const sDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const eDate = end_date || new Date().toISOString().slice(0, 10);

    // 1. Sales & COGS
    const [salesSummary] = await query(
      `SELECT 
         COALESCE(SUM(s.grand_total), 0) as gross_sales,
         COALESCE(SUM(s.subtotal), 0) as net_sales_subtotal,
         COALESCE(SUM(s.discount_amount), 0) as total_discounts,
         COALESCE(SUM(s.tax_amount), 0) as total_taxes,
         COUNT(s.id) as total_orders
       FROM sales s
       WHERE s.sale_date >= ? AND s.sale_date <= ?`,
      [sDate, eDate]
    );

    const [cogsSummary] = await query(
      `SELECT COALESCE(SUM(si.unit_purchase_price), 0) as cogs
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE s.sale_date >= ? AND s.sale_date <= ?`,
      [sDate, eDate]
    );

    // 2. Returns & Refunds
    const [returnsSummary] = await query(
      `SELECT COALESCE(SUM(total_refund_amount), 0) as total_refunds, COUNT(id) as return_count
       FROM sales_returns
       WHERE return_date >= ? AND return_date <= ?`,
      [sDate, eDate]
    );

    // 3. Operating Expenses by Category
    const expenseBreakdown = await query(
      `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(id) as count
       FROM expenses
       WHERE expense_date >= ? AND expense_date <= ?
       GROUP BY category`,
      [sDate, eDate]
    );

    const totalExpenses = expenseBreakdown.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);

    const grossSalesVal = parseFloat(salesSummary.gross_sales);
    const totalRefundsVal = parseFloat(returnsSummary.total_refunds);
    const adjustedSales = grossSalesVal - totalRefundsVal;
    const cogsVal = parseFloat(cogsSummary.cogs);
    const grossProfit = adjustedSales - cogsVal;
    const netProfit = grossProfit - totalExpenses;
    const grossProfitMargin = adjustedSales > 0 ? (grossProfit / adjustedSales) * 100 : 0;
    const netProfitMargin = adjustedSales > 0 ? (netProfit / adjustedSales) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { start: sDate, end: eDate },
        revenue: {
          grossSales: grossSalesVal,
          totalRefunds: totalRefundsVal,
          adjustedRevenue: adjustedSales,
          ordersCount: salesSummary.total_orders,
          totalDiscounts: parseFloat(salesSummary.total_discounts),
          totalTaxes: parseFloat(salesSummary.total_taxes)
        },
        costOfGoodsSold: cogsVal,
        grossProfit,
        grossProfitMargin: grossProfitMargin.toFixed(2),
        expenses: {
          total: totalExpenses,
          breakdown: expenseBreakdown
        },
        netProfit,
        netProfitMargin: netProfitMargin.toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovementsReport = async (req, res, next) => {
  try {
    const { barcode, movement_type, start_date, end_date, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT m.*, p.name as product_name, p.sku,
             fl.name as from_location_name, tl.name as to_location_name,
             u.name as user_name
      FROM stock_movements m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN stock_locations fl ON m.from_location_id = fl.id
      LEFT JOIN stock_locations tl ON m.to_location_id = tl.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (barcode) {
      sql += ' AND m.barcode LIKE ?';
      params.push(`%${barcode.trim()}%`);
    }
    if (movement_type) {
      sql += ' AND m.movement_type = ?';
      params.push(movement_type);
    }
    if (start_date) {
      sql += ' AND DATE(m.movement_date) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(m.movement_date) <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY m.movement_date DESC, m.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const movements = await query(sql, params);

    res.json({
      success: true,
      data: { movements }
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffSalesReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT u.id as user_id, u.name as staff_name, u.email as staff_email,
             COUNT(s.id) as total_bills,
             COALESCE(SUM(s.grand_total), 0) as total_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'CASH' THEN s.grand_total ELSE 0 END), 0) as cash_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'UPI' THEN s.grand_total ELSE 0 END), 0) as upi_sales,
             COALESCE(SUM(CASE WHEN s.payment_method = 'CARD' THEN s.grand_total ELSE 0 END), 0) as card_sales,
             COALESCE(SUM(CASE WHEN s.payment_method NOT IN ('CASH', 'UPI', 'CARD') THEN s.grand_total ELSE 0 END), 0) as other_sales
      FROM users u
      LEFT JOIN sales s ON u.id = s.cashier_id
      WHERE u.status = 'ACTIVE'
    `;
    const params = [];

    if (start_date && end_date) {
      sql += ' AND s.sale_date >= ? AND s.sale_date <= ?';
      params.push(start_date, end_date);
    }

    sql += ' GROUP BY u.id, u.name, u.email ORDER BY total_sales DESC';

    const staffSales = await query(sql, params);

    res.json({
      success: true,
      data: { staffSales }
    });
  } catch (error) {
    next(error);
  }
};
