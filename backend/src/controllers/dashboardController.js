import { query } from '../config/db.js';

export const getStats = async (req, res, next) => {
  try {
    // 1. Sales Stats
    const [todaySales] = await query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count 
       FROM sales WHERE sale_date = CURDATE()`
    );

    const [monthlySales] = await query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count 
       FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())`
    );

    const [totalSales] = await query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales`
    );

    // 2. Stock Stats
    const [showroomStock] = await query(
      `SELECT COUNT(id) as total FROM product_units WHERE location_id = 1 AND status = 'AVAILABLE'`
    );

    const [warehouseStock] = await query(
      `SELECT COUNT(id) as total FROM product_units WHERE location_id = 2 AND status = 'AVAILABLE'`
    );

    // Low stock count (Products where available showroom stock <= reorder_level)
    const [lowStock] = await query(
      `SELECT COUNT(*) as count FROM (
         SELECT p.id, p.reorder_level, 
                COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as available_units
         FROM products p
         LEFT JOIN product_units u ON p.id = u.product_id
         WHERE p.status = 'ACTIVE'
         GROUP BY p.id, p.reorder_level
         HAVING available_units <= p.reorder_level AND available_units > 0
       ) as low_stock_items`
    );

    const [outOfStock] = await query(
      `SELECT COUNT(*) as count FROM (
         SELECT p.id, 
                COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as available_units
         FROM products p
         LEFT JOIN product_units u ON p.id = u.product_id
         WHERE p.status = 'ACTIVE'
         GROUP BY p.id
         HAVING available_units = 0
       ) as out_of_stock_items`
    );

    // 3. Purchase Stats
    const [todayPurchases] = await query(
      `SELECT COALESCE(SUM(grand_total), 0) as total FROM purchases WHERE purchase_date = CURDATE()`
    );

    const [monthlyPurchases] = await query(
      `SELECT COALESCE(SUM(grand_total), 0) as total 
       FROM purchases WHERE YEAR(purchase_date) = YEAR(CURDATE()) AND MONTH(purchase_date) = MONTH(CURDATE())`
    );

    // 4. Accounts & Profit Stats (Today)
    const [todayExpenses] = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = CURDATE()`
    );

    // Today's COGS for Gross Profit
    const [todayCOGS] = await query(
      `SELECT COALESCE(SUM(si.unit_purchase_price), 0) as cogs
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE s.sale_date = CURDATE()`
    );

    const todayIncomeVal = parseFloat(todaySales.total);
    const todayExpenseVal = parseFloat(todayExpenses.total);
    const todayCogsVal = parseFloat(todayCOGS.cogs);
    const todayGrossProfit = todayIncomeVal - todayCogsVal;
    const todayNetProfit = todayGrossProfit - todayExpenseVal;

    // 5. Staff Attendance Stats (Today)
    const [staffPresent] = await query(
      `SELECT COUNT(DISTINCT user_id) as count FROM attendance WHERE date = CURDATE() AND status = 'Present'`
    );
    const [staffTotal] = await query(
      `SELECT COUNT(id) as count FROM users WHERE role = 'BILLING_USER' AND status = 'ACTIVE'`
    );
    const presentCount = staffPresent.count || 0;
    const absentCount = Math.max(0, (staffTotal.count || 0) - presentCount);

    res.json({
      success: true,
      data: {
        sales: {
          today: parseFloat(todaySales.total),
          todayCount: todaySales.count,
          monthly: parseFloat(monthlySales.total),
          monthlyCount: monthlySales.count,
          total: parseFloat(totalSales.total),
          totalCount: totalSales.count
        },
        stock: {
          showroom: showroomStock.total,
          warehouse: warehouseStock.total,
          lowStock: lowStock.count,
          outOfStock: outOfStock.count
        },
        purchases: {
          today: parseFloat(todayPurchases.total),
          monthly: parseFloat(monthlyPurchases.total)
        },
        accounts: {
          todayIncome: todayIncomeVal,
          todayExpense: todayExpenseVal,
          todayGrossProfit,
          todayNetProfit
        },
        staff: {
          present: presentCount,
          absent: absentCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCharts = async (req, res, next) => {
  try {
    const range = req.query.range || '7d'; // '7d', '30d', '90d', '1y'
    let days = 7;
    if (range === '30d') days = 30;
    else if (range === '90d') days = 90;
    else if (range === '1y') days = 365;

    // 1. Daily Sales Trend
    const dailySales = await query(
      `SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') as date, 
              COALESCE(SUM(grand_total), 0) as sales,
              COUNT(id) as count
       FROM sales
       WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
       ORDER BY date ASC`,
      [days]
    );

    // 2. Category-wise Sales
    const categorySales = await query(
      `SELECT c.name as category, COALESCE(SUM(si.line_total), 0) as total, COUNT(si.id) as units_sold
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       GROUP BY c.id, c.name
       ORDER BY total DESC LIMIT 6`
    );

    // 3. Payment Method Distribution
    const paymentDistribution = await query(
      `SELECT payment_method, COALESCE(SUM(grand_total), 0) as amount, COUNT(id) as count
       FROM sales
       GROUP BY payment_method`
    );

    // 4. Stock Distribution (Showroom vs Warehouse by Category)
    const stockDistribution = await query(
      `SELECT c.name as category,
              SUM(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 ELSE 0 END) as showroom_stock,
              SUM(CASE WHEN u.location_id = 2 AND u.status = 'AVAILABLE' THEN 1 ELSE 0 END) as warehouse_stock
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       LEFT JOIN product_units u ON p.id = u.product_id
       GROUP BY c.id, c.name`
    );

    // 5. Recent Activity / Alerts
    const lowStockAlerts = await query(
      `SELECT p.id, p.name, p.sku, p.reorder_level, c.name as category,
              COUNT(CASE WHEN u.location_id = 1 AND u.status = 'AVAILABLE' THEN 1 END) as showroom_units,
              COUNT(CASE WHEN u.location_id = 2 AND u.status = 'AVAILABLE' THEN 1 END) as warehouse_units
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_units u ON p.id = u.product_id
       WHERE p.status = 'ACTIVE'
       GROUP BY p.id, p.name, p.sku, p.reorder_level, c.name
       HAVING showroom_units <= p.reorder_level
       ORDER BY showroom_units ASC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        dailySales,
        categorySales,
        paymentDistribution,
        stockDistribution,
        lowStockAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};
