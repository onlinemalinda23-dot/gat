const { query } = require('../config/db');

exports.daily = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const jobsResult = await query(
      `SELECT
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'repairing') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'received') AS new_received
       FROM job_cards
       WHERE DATE(received_at) = $1`,
      [date]
    );

    const incomeResult = await query(
      `SELECT COALESCE(SUM(amount),0) AS total_income
       FROM payments
       WHERE DATE(received_at) = $1`,
      [date]
    );

    const expensesResult = await query(
      `SELECT COALESCE(SUM(total_amount),0) AS total_expenses
       FROM purchases
       WHERE DATE(purchase_date) = $1`,
      [date]
    );

    const recentJobs = await query(
      `SELECT j.job_card_number, c.name AS customer_name, v.vehicle_number, j.status, j.received_at
       FROM job_cards j
       JOIN customers c ON j.customer_id = c.id
       JOIN vehicles v ON j.vehicle_id = v.id
       WHERE DATE(j.received_at) = $1
       ORDER BY j.received_at DESC LIMIT 20`,
      [date]
    );

    res.json({
      success: true,
      data: {
        date,
        jobs: jobsResult.rows[0],
        income: Number(incomeResult.rows[0].total_income),
        expenses: Number(expensesResult.rows[0].total_expenses),
        profit: Number(incomeResult.rows[0].total_income) - Number(expensesResult.rows[0].total_expenses),
        recentJobs: recentJobs.rows,
      },
    });
  } catch (err) { next(err); }
};

exports.monthly = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    // Most repaired vehicle models
    const topModels = await query(
      `SELECT v.brand, v.model, COUNT(*) AS repair_count
       FROM job_cards j JOIN vehicles v ON j.vehicle_id = v.id
       WHERE EXTRACT(YEAR FROM j.received_at) = $1 AND EXTRACT(MONTH FROM j.received_at) = $2
       GROUP BY v.brand, v.model ORDER BY repair_count DESC LIMIT 10`,
      [year, month]
    );

    // Most used parts
    const topParts = await query(
      `SELECT p.name, p.part_number, SUM(jcp.quantity) AS total_used, SUM(jcp.total_price) AS total_cost
       FROM job_card_parts jcp
       JOIN parts p ON jcp.part_id = p.id
       JOIN job_cards j ON jcp.job_card_id = j.id
       WHERE EXTRACT(YEAR FROM j.received_at) = $1 AND EXTRACT(MONTH FROM j.received_at) = $2
       GROUP BY p.id, p.name, p.part_number ORDER BY total_used DESC LIMIT 10`,
      [year, month]
    );

    // Sales summary
    const salesResult = await query(
      `SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total),0) AS total_revenue,
        COALESCE(SUM(discount),0) AS total_discounts,
        COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid,
        COUNT(*) FILTER (WHERE payment_status = 'partial') AS partial,
        COUNT(*) FILTER (WHERE payment_status = 'unpaid') AS unpaid
       FROM invoices
       WHERE EXTRACT(YEAR FROM issued_at) = $1 AND EXTRACT(MONTH FROM issued_at) = $2`,
      [year, month]
    );

    // Stock report
    const stockResult = await query(
      `SELECT p.name, p.part_number, p.quantity, p.low_stock_threshold,
              CASE WHEN p.quantity <= p.low_stock_threshold THEN TRUE ELSE FALSE END AS low_stock,
              s.name AS supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.is_active = TRUE
       ORDER BY p.quantity ASC`
    );

    // Monthly expenses
    const expensesResult = await query(
      `SELECT COALESCE(SUM(total_amount),0) AS total_purchases
       FROM purchases
       WHERE EXTRACT(YEAR FROM purchase_date) = $1 AND EXTRACT(MONTH FROM purchase_date) = $2`,
      [year, month]
    );

    // Daily breakdown for the period chart (jobs per day)
    const dailyJobs = await query(
      `SELECT DATE(received_at) AS day, COUNT(*) AS jobs
       FROM job_cards
       WHERE EXTRACT(YEAR FROM received_at) = $1 AND EXTRACT(MONTH FROM received_at) = $2
       GROUP BY DATE(received_at) ORDER BY day`,
      [year, month]
    );

    // Daily income (payments received per day)
    const dailyIncome = await query(
      `SELECT DATE(received_at) AS day, COALESCE(SUM(amount),0) AS income
       FROM payments
       WHERE EXTRACT(YEAR FROM received_at) = $1 AND EXTRACT(MONTH FROM received_at) = $2
       GROUP BY DATE(received_at) ORDER BY day`,
      [year, month]
    );

    const dailyBreakdown = dailyJobs.rows.map((r) => ({
      day: r.day,
      jobs: Number(r.jobs),
      income: Number((dailyIncome.rows.find((i) => String(i.day) === String(r.day)) || {}).income || 0),
    }));

    res.json({
      success: true,
      data: {
        period: `${year}-${String(month).padStart(2, '0')}`,
        topRepairedModels: topModels.rows,
        topUsedParts: topParts.rows,
        sales: salesResult.rows[0],
        expenses: Number(expensesResult.rows[0].total_purchases),
        stockStatus: stockResult.rows,
        dailyBreakdown,
      },
    });
  } catch (err) { next(err); }
};