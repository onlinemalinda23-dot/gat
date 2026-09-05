const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const status = req.query.status;
    const search = req.query.search || '';

    const params = [];
    let where = '';

    if (status) {
      params.push(status);
      where += ` WHERE a.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += where ? ` AND` : ` WHERE`;
      where += ` (c.name ILIKE $${params.length} OR v.vehicle_number ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a
       JOIN customers c ON a.customer_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id${where}`, params
    );

    const result = await query(
      `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone,
              v.vehicle_number, v.brand, v.model
       FROM appointments a
       JOIN customers c ON a.customer_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       ${where}
       ORDER BY a.scheduled_at ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone,
              v.vehicle_number, v.brand, v.model
       FROM appointments a
       JOIN customers c ON a.customer_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { customer_id, vehicle_id, scheduled_at, service_type, notes } = req.body;
    const result = await query(
      `INSERT INTO appointments (customer_id, vehicle_id, scheduled_at, service_type, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customer_id, vehicle_id, scheduled_at, service_type, notes, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { scheduled_at, service_type, notes } = req.body;
    const result = await query(
      `UPDATE appointments SET
        scheduled_at = COALESCE($2, scheduled_at),
        service_type = COALESCE($3, service_type),
        notes = COALESCE($4, notes)
       WHERE id = $1 RETURNING *`,
      [req.params.id, scheduled_at, service_type, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE appointments SET status = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM appointments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (err) { next(err); }
};
