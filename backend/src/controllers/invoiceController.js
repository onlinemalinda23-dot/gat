const { query, withTransaction } = require('../config/db');
const { generateInvoiceNumber } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

exports.create = async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const { job_card_id, discount, tax, payment_method, amount_paid } = req.body;

      const jcResult = await client.query(
        'SELECT * FROM job_cards WHERE id = $1', [job_card_id]
      );
      if (jcResult.rows.length === 0) {
        throw Object.assign(new Error('Job card not found'), { isOperational: true });
      }
      const jc = jcResult.rows[0];

      const seqResult = await client.query('SELECT COUNT(*) FROM invoices');
      const invoiceNumber = generateInvoiceNumber(Number(seqResult.rows[0].count) + 1);

      const discountAmt = discount || 0;
      const taxAmt = tax || 0;
      const subtotal = jc.grand_total;
      const total = subtotal - discountAmt + taxAmt;

      const invResult = await client.query(
        `INSERT INTO invoices (invoice_number, job_card_id, customer_id, vehicle_id, subtotal, discount, tax, total, payment_method, payment_status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [invoiceNumber, job_card_id, jc.customer_id, jc.vehicle_id, subtotal, discountAmt, taxAmt, total,
         payment_method || null, (amount_paid && amount_paid >= total) ? 'paid' : (amount_paid > 0 ? 'partial' : 'unpaid'),
         req.user.id]
      );
      const invoice = invResult.rows[0];

      // Add line items from job card parts
      const parts = await client.query(
        `SELECT jcp.*, p.name AS part_name FROM job_card_parts jcp JOIN parts p ON jcp.part_id = p.id WHERE jcp.job_card_id = $1`,
        [job_card_id]
      );
      for (const p of parts.rows) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_type, part_id, description, quantity, unit_price, total_price)
           VALUES ($1,'part',$2,$3,$4,$5,$6)`,
          [invoice.id, p.part_id, p.part_name, p.quantity, p.unit_price, p.total_price]
        );
      }

      // Add labour items
      const labour = await client.query(
        'SELECT * FROM labour_charges WHERE job_card_id = $1', [job_card_id]
      );
      for (const l of labour.rows) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
           VALUES ($1,'labour',$2,1,$3,$3)`,
          [invoice.id, l.description, l.amount]
        );
      }

      // Record payment if provided
      if (amount_paid && amount_paid > 0) {
        await client.query(
          `INSERT INTO payments (invoice_id, amount, method, received_by) VALUES ($1,$2,$3,$4)`,
          [invoice.id, amount_paid, payment_method, req.user.id]
        );
      }

      res.status(201).json({ success: true, data: invoice });
    });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.payment_status;

    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`i.payment_status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM invoices i JOIN customers c ON i.customer_id = c.id ${where}`, params
    );
    const result = await query(
      `SELECT i.*, c.name AS customer_name, j.job_card_number
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN job_cards j ON i.job_card_id = j.id
       ${where}
       ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: Number(countResult.rows[0].count),
        page,
        limit,
        pages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone,
              v.vehicle_number, v.brand, v.model,
              j.job_card_number
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN vehicles v ON i.vehicle_id = v.id
       JOIN job_cards j ON i.job_card_id = j.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    const payments = await query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY received_at', [req.params.id]);

    res.json({ success: true, data: { ...result.rows[0], items: items.rows, payments: payments.rows } });
  } catch (err) { next(err); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const { amount, method, reference } = req.body;

    const result = await withTransaction(async (client) => {
      const invResult = await client.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
      if (invResult.rows.length === 0) throw Object.assign(new Error('Invoice not found'), { isOperational: true });

      const invoice = invResult.rows[0];

      await client.query(
        `INSERT INTO payments (invoice_id, amount, method, reference, received_by) VALUES ($1,$2,$3,$4,$5)`,
        [invoice.id, amount, method, reference, req.user.id]
      );

      // Calculate total paid
      const paidResult = await client.query(
        'SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE invoice_id = $1',
        [invoice.id]
      );
      const totalPaid = Number(paidResult.rows[0].total_paid);

      let newStatus = 'unpaid';
      if (totalPaid >= invoice.total) newStatus = 'paid';
      else if (totalPaid > 0) newStatus = 'partial';

      await client.query(
        'UPDATE invoices SET payment_status = $2, payment_method = $3 WHERE id = $1',
        [invoice.id, newStatus, method]
      );

      return { invoice, newStatus };
    });

    // Send payment confirmation notification AFTER the transaction commits
    // (keeps notification writes out of the transaction — required so the
    // embedded driver and PostgreSQL behave identically)
    try {
      await notificationService.sendPushNotification({
        customerId: result.invoice.customer_id,
        vehicleId: result.invoice.vehicle_id,
        jobCardId: result.invoice.job_card_id,
        title: 'Payment Received',
        message: `Payment of ${amount} received for invoice ${result.invoice.invoice_number}. Status: ${result.newStatus}`,
      });
    } catch (_) { /* non-critical */ }

    res.json({ success: true, message: `Payment recorded. Invoice status: ${result.newStatus}` });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) { next(err); }
};