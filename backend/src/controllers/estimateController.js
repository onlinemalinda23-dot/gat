const { query, withTransaction } = require('../config/db');
const { paginate } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

function generateEstimateNumber(id) {
  const seq = String(id || Math.floor(Math.random() * 10000)).padStart(6, '0');
  return `EST-${seq}`;
}

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const status = req.query.status;
    const search = req.query.search || '';

    const params = [];
    let where = '';

    if (status) {
      params.push(status);
      where += ` WHERE e.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += where ? ' AND' : ' WHERE';
      where += ` (e.estimate_number ILIKE $${params.length} OR cu.name ILIKE $${params.length} OR v.vehicle_number ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM estimates e
       JOIN customers cu ON e.customer_id = cu.id
       JOIN vehicles v ON e.vehicle_id = v.id${where}`,
      params
    );

    const result = await query(
      `SELECT e.*, cu.name AS customer_name, cu.phone AS customer_phone,
              v.vehicle_number, v.brand, v.model,
              j.job_card_number
       FROM estimates e
       JOIN customers cu ON e.customer_id = cu.id
       JOIN vehicles v ON e.vehicle_id = v.id
       JOIN job_cards j ON e.job_card_id = j.id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.address AS customer_address,
              v.vehicle_number, v.brand, v.model, v.year,
              j.job_card_number
       FROM estimates e
       JOIN customers cu ON e.customer_id = cu.id
       JOIN vehicles v ON e.vehicle_id = v.id
       JOIN job_cards j ON e.job_card_id = j.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Estimate not found' });

    const items = await query(
      `SELECT ei.*, p.name AS part_name, p.part_number
       FROM estimate_items ei
       LEFT JOIN parts p ON ei.part_id = p.id
       WHERE ei.estimate_id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
  } catch (err) { next(err); }
};

/**
 * Create an estimate from a job card.
 * Snapshot: copies current job card parts + labour into estimate items
 * and computes parts_cost / labour_cost / total.
 */
exports.create = async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const { job_card_id, discount, valid_until, notes } = req.body;

      const jcResult = await client.query('SELECT * FROM job_cards WHERE id = $1', [job_card_id]);
      if (jcResult.rows.length === 0) {
        throw Object.assign(new Error('Job card not found'), { isOperational: true });
      }
      const jc = jcResult.rows[0];

      const seqResult = await client.query('SELECT COUNT(*) FROM estimates');
      const estimateNumber = generateEstimateNumber(Number(seqResult.rows[0].count) + 1);

      const parts = await client.query(
        `SELECT jcp.part_id, p.name AS part_name, jcp.quantity, jcp.unit_price, jcp.total_price
         FROM job_card_parts jcp JOIN parts p ON jcp.part_id = p.id
         WHERE jcp.job_card_id = $1`,
        [job_card_id]
      );
      const labour = await client.query(
        'SELECT * FROM labour_charges WHERE job_card_id = $1', [job_card_id]
      );

      const partsCost = parts.rows.reduce((s, r) => s + Number(r.total_price), 0);
      const labourCost = labour.rows.reduce((s, r) => s + Number(r.amount), 0);
      const discountAmt = discount || 0;
      const total = partsCost + labourCost - discountAmt;

      const estResult = await client.query(
        `INSERT INTO estimates (estimate_number, job_card_id, customer_id, vehicle_id,
                               parts_cost, labour_cost, discount, total, valid_until, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [estimateNumber, job_card_id, jc.customer_id, jc.vehicle_id, partsCost, labourCost, discountAmt, total, valid_until, notes, req.user.id]
      );
      const estimate = estResult.rows[0];

      for (const p of parts.rows) {
        await client.query(
          `INSERT INTO estimate_items (estimate_id, item_type, part_id, description, quantity, unit_price, total_price)
           VALUES ($1,'part',$2,$3,$4,$5,$6)`,
          [estimate.id, p.part_id, p.part_name, p.quantity, p.unit_price, p.total_price]
        );
      }
      for (const l of labour.rows) {
        await client.query(
          `INSERT INTO estimate_items (estimate_id, item_type, description, quantity, unit_price, total_price)
           VALUES ($1,'labour',$2,1,$3,$3)`,
          [estimate.id, l.description, l.amount]
        );
      }

      res.status(201).json({ success: true, data: estimate });
    });
  } catch (err) { next(err); }
};

/** Approve / reject / convert an estimate */
exports.update = async (req, res, next) => {
  try {
    const { status, discount, notes } = req.body;
    const result = await query(
      `UPDATE estimates SET
        status = COALESCE($2, status),
        discount = COALESCE($3, discount),
        notes = COALESCE($4, notes),
        total = CASE WHEN $3::numeric IS NOT NULL THEN parts_cost + labour_cost - $3::numeric ELSE total END
       WHERE id = $1 RETURNING *`,
      [req.params.id, status, discount, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Estimate not found' });

    // Notify customer when estimate is approved
    const est = result.rows[0];
    if (status === 'approved') {
      try {
        await notificationService.sendPushNotification({
          customerId: est.customer_id,
          vehicleId: est.vehicle_id,
          jobCardId: est.job_card_id,
          title: 'Estimate Approved',
          message: `Your estimate ${est.estimate_number} for ${est.total} has been approved. Work will begin shortly.`,
        });
      } catch (_) { /* non-critical */ }
    }

    res.json({ success: true, data: est });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM estimates WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, message: 'Estimate deleted' });
  } catch (err) { next(err); }
};