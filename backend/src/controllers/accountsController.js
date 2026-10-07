import { query, transaction } from '../config/db.js';
import { getNextDocumentNumber } from '../utils/numberGenerators.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';

export const getExpenses = async (req, res, next) => {
  try {
    const { category, start_date, end_date, search, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT e.*, u.name as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (start_date) {
      sql += ' AND e.expense_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND e.expense_date <= ?';
      params.push(end_date);
    }
    if (search) {
      sql += ' AND (e.expense_number LIKE ? OR e.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const expenses = await query(sql, params);

    // Sum of expenses
    const [totalSum] = await query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');

    res.json({
      success: true,
      data: {
        expenses,
        totalExpenses: parseFloat(totalSum.total)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { category, description, amount, payment_method = 'CASH', expense_date } = req.body;

    if (!category || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Category and positive amount are required.',
        code: 'INVALID_EXPENSE_DATA'
      });
    }

    const expenseNumber = await getNextDocumentNumber('EXPENSE');
    const amountVal = parseFloat(amount);

    const result = await query(
      `INSERT INTO expenses 
       (expense_number, expense_date, category, description, amount, payment_method, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseNumber,
        expense_date || new Date().toISOString().slice(0, 10),
        category.trim(),
        description ? description.trim() : null,
        amountVal,
        payment_method,
        req.user.id
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'EXPENSE_CREATED',
      module: 'ACCOUNTS',
      recordId: expenseNumber,
      newValue: {
        expenseNumber,
        category,
        amount: amountVal,
        paymentMethod: payment_method
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Expense ${expenseNumber} of ₹${amountVal} recorded.`,
      data: { id: result.insertId, expenseNumber }
    });
  } catch (error) {
    next(error);
  }
};

export const getDailySummary = async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

    // 1. Sales by payment method on target date
    const [cashSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales WHERE sale_date = ? AND payment_method = 'CASH'",
      [targetDate]
    );
    const [upiSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales WHERE sale_date = ? AND payment_method = 'UPI'",
      [targetDate]
    );
    const [cardSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales WHERE sale_date = ? AND payment_method = 'CARD'",
      [targetDate]
    );
    const [otherSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales WHERE sale_date = ? AND payment_method NOT IN ('CASH', 'UPI', 'CARD')",
      [targetDate]
    );
    const [totalSales] = await query(
      'SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM sales WHERE sale_date = ?',
      [targetDate]
    );

    // 2. Expenses on target date
    const [expenses] = await query(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(id) as count FROM expenses WHERE expense_date = ?',
      [targetDate]
    );
    const [cashExpenses] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = ? AND payment_method = 'CASH'",
      [targetDate]
    );

    // 3. Refunds on target date
    const [refunds] = await query(
      'SELECT COALESCE(SUM(total_refund_amount), 0) as total, COUNT(id) as count FROM sales_returns WHERE return_date = ?',
      [targetDate]
    );

    // 4. COGS & Gross Profit
    const [cogs] = await query(
      `SELECT COALESCE(SUM(si.unit_purchase_price), 0) as total
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE s.sale_date = ?`,
      [targetDate]
    );

    const cashSalesVal = parseFloat(cashSales.total);
    const upiSalesVal = parseFloat(upiSales.total);
    const cardSalesVal = parseFloat(cardSales.total);
    const otherSalesVal = parseFloat(otherSales.total);
    const totalSalesVal = parseFloat(totalSales.total);
    const expensesVal = parseFloat(expenses.total);
    const cashExpensesVal = parseFloat(cashExpenses.total);
    const refundsVal = parseFloat(refunds.total);
    const cogsVal = parseFloat(cogs.total);

    const grossProfit = totalSalesVal - cogsVal;
    const netProfit = grossProfit - expensesVal;
    
    // Expected cash in drawer = (Cash Sales - Cash Expenses - Cash Refunds)
    const expectedCashInDrawer = Math.max(0, cashSalesVal - cashExpensesVal);

    // Check if daily closing has already been submitted for this date
    const [existingClosing] = await query(
      `SELECT dc.*, u.name as closed_by_name 
       FROM daily_closings dc 
       LEFT JOIN users u ON dc.closed_by = u.id 
       WHERE dc.closing_date = ?`,
      [targetDate]
    );

    res.json({
      success: true,
      data: {
        date: targetDate,
        sales: {
          cash: cashSalesVal,
          cashCount: cashSales.count,
          upi: upiSalesVal,
          upiCount: upiSales.count,
          card: cardSalesVal,
          cardCount: cardSales.count,
          other: otherSalesVal,
          otherCount: otherSales.count,
          total: totalSalesVal,
          totalCount: totalSales.count
        },
        expenses: expensesVal,
        cashExpenses: cashExpensesVal,
        refunds: refundsVal,
        cogs: cogsVal,
        grossProfit,
        netProfit,
        expectedCash: expectedCashInDrawer,
        isClosed: !!existingClosing,
        closingDetails: existingClosing || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const submitDailyClosing = async (req, res, next) => {
  try {
    const {
      closing_date,
      opening_balance = 0,
      actual_cash,
      notes
    } = req.body;

    if (actual_cash === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Actual counted cash amount is required for daily drawer closing.',
        code: 'MISSING_ACTUAL_CASH'
      });
    }

    const dateToClose = closing_date || new Date().toISOString().slice(0, 10);

    // Get live figures for that date
    const [cashSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE sale_date = ? AND payment_method = 'CASH'",
      [dateToClose]
    );
    const [upiSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE sale_date = ? AND payment_method = 'UPI'",
      [dateToClose]
    );
    const [cardSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE sale_date = ? AND payment_method = 'CARD'",
      [dateToClose]
    );
    const [otherSales] = await query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE sale_date = ? AND payment_method NOT IN ('CASH', 'UPI', 'CARD')",
      [dateToClose]
    );
    const [totalSales] = await query(
      'SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE sale_date = ?',
      [dateToClose]
    );
    const [expenses] = await query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = ?',
      [dateToClose]
    );
    const [cashExpenses] = await query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = ? AND payment_method = 'CASH'",
      [dateToClose]
    );
    const [refunds] = await query(
      'SELECT COALESCE(SUM(total_refund_amount), 0) as total FROM sales_returns WHERE return_date = ?',
      [dateToClose]
    );

    const openBal = parseFloat(opening_balance) || 0;
    const cashSalesVal = parseFloat(cashSales.total);
    const upiSalesVal = parseFloat(upiSales.total);
    const cardSalesVal = parseFloat(cardSales.total);
    const otherSalesVal = parseFloat(otherSales.total);
    const totalSalesVal = parseFloat(totalSales.total);
    const expensesVal = parseFloat(expenses.total);
    const cashExpensesVal = parseFloat(cashExpenses.total);
    const refundsVal = parseFloat(refunds.total);
    const actualCashVal = parseFloat(actual_cash);

    const expectedCashVal = openBal + cashSalesVal - cashExpensesVal;
    const differenceVal = actualCashVal - expectedCashVal;

    await query(
      `INSERT INTO daily_closings 
       (closing_date, opening_balance, total_sales_cash, total_sales_upi, total_sales_card, total_sales_other, total_sales_amount, total_expenses, total_refunds, expected_cash, actual_cash, difference, closed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       opening_balance = VALUES(opening_balance),
       total_sales_cash = VALUES(total_sales_cash),
       total_sales_upi = VALUES(total_sales_upi),
       total_sales_card = VALUES(total_sales_card),
       total_sales_other = VALUES(total_sales_other),
       total_sales_amount = VALUES(total_sales_amount),
       total_expenses = VALUES(total_expenses),
       total_refunds = VALUES(total_refunds),
       expected_cash = VALUES(expected_cash),
       actual_cash = VALUES(actual_cash),
       difference = VALUES(difference),
       closed_by = VALUES(closed_by),
       notes = VALUES(notes)`,
      [
        dateToClose,
        openBal,
        cashSalesVal,
        upiSalesVal,
        cardSalesVal,
        otherSalesVal,
        totalSalesVal,
        expensesVal,
        refundsVal,
        expectedCashVal,
        actualCashVal,
        differenceVal,
        req.user.id,
        notes || null
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      role: req.user.role,
      action: 'DAILY_CLOSING_SUBMITTED',
      module: 'ACCOUNTS',
      recordId: dateToClose,
      newValue: {
        date: dateToClose,
        expectedCash: expectedCashVal,
        actualCash: actualCashVal,
        difference: differenceVal
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Daily closing for ${dateToClose} saved successfully. Variance: ₹${differenceVal}`,
      data: {
        date: dateToClose,
        expectedCash: expectedCashVal,
        actualCash: actualCashVal,
        difference: differenceVal
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getClosingHistory = async (req, res, next) => {
  try {
    const closings = await query(
      `SELECT dc.*, u.name as closed_by_name 
       FROM daily_closings dc 
       LEFT JOIN users u ON dc.closed_by = u.id 
       ORDER BY dc.closing_date DESC 
       LIMIT 30`
    );

    res.json({
      success: true,
      data: { closings }
    });
  } catch (error) {
    next(error);
  }
};
