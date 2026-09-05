const { query, withTransaction } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const search = req.query.search || '';

    let where = '';
    const params = [];
    if (search) {
      where = `WHERE v.vehicle_number ILIKE $1 OR v.brand ILIKE $1 OR v.model ILIKE $1 OR c.name ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM vehicles v JOIN customers c ON v.customer_id = c.id ${where}`, params
    );
    const result = await query(
      `SELECT v.*, c.name AS owner_name, c.phone AS owner_phone
       FROM vehicles v JOIN customers c ON v.customer_id = c.id ${where}
       ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, c.name AS owner_name, c.phone AS owner_phone
       FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const history = await query(
      'SELECT * FROM repair_history WHERE vehicle_id = $1 ORDER BY repair_date DESC', [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], repairHistory: history.rows } });
  } catch (err) { next(err); }
};

exports.getByNumber = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT v.*, c.name AS owner_name, c.phone AS owner_phone
       FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.vehicle_number ILIKE $1`,
      [req.params.number]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const history = await query(
      'SELECT * FROM repair_history WHERE vehicle_id = $1 ORDER BY repair_date DESC', [result.rows[0].id]
    );
    res.json({ success: true, data: { ...result.rows[0], repairHistory: history.rows } });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { customer_id, vehicle_number, brand, model, year, chassis_number, engine_number, mileage, fuel_type } = req.body;
    const result = await query(
      `INSERT INTO vehicles (customer_id, vehicle_number, brand, model, year, chassis_number, engine_number, mileage, fuel_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [customer_id, vehicle_number, brand, model, year || null, chassis_number || null, engine_number || null, mileage || null, fuel_type]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      err.message = 'Vehicle number already exists for this customer';
      err.isOperational = true;
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { vehicle_number, brand, model, year, chassis_number, engine_number, mileage, fuel_type } = req.body;
    const result = await query(
      `UPDATE vehicles SET
        vehicle_number = COALESCE($2, vehicle_number), brand = COALESCE($3, brand),
        model = COALESCE($4, model), year = COALESCE($5, year),
        chassis_number = COALESCE($6, chassis_number), engine_number = COALESCE($7, engine_number),
        mileage = COALESCE($8, mileage), fuel_type = COALESCE($9, fuel_type)
       WHERE id = $1 RETURNING *`,
      [req.params.id, vehicle_number, brand, model, year || null, chassis_number || null, engine_number || null, mileage || null, fuel_type]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) { next(err); }
};

/** Vehicle model part history — common repairs for a given brand+model */
exports.modelPartHistory = async (req, res, next) => {
  try {
    const { brand, model } = req.params;

    // All job cards for this model
    const jcResult = await query(
      `SELECT j.id FROM job_cards j
       JOIN vehicles v ON j.vehicle_id = v.id
       WHERE v.brand ILIKE $1 AND v.model ILIKE $2`,
      [brand, model]
    );
    const jobCardIds = jcResult.rows.map(r => r.id);

    if (jobCardIds.length === 0) {
      return res.json({ success: true, data: { brand, model, totalJobs: 0, parts: [], suppliers: [], frequency: [] } });
    }

    // Parts used across these jobs
    const partsResult = await query(
      `SELECT p.name, p.part_number, SUM(jcp.quantity) AS total_used,
              COUNT(DISTINCT jcp.job_card_id) AS jobs_count
       FROM job_card_parts jcp
       JOIN parts p ON jcp.part_id = p.id
       WHERE jcp.job_card_id = ANY($1)
       GROUP BY p.id, p.name, p.part_number
       ORDER BY total_used DESC`,
      [jobCardIds]
    );

    // Suppliers used
    const suppliersResult = await query(
      `SELECT DISTINCT s.name, s.contact_number
       FROM job_card_parts jcp
       JOIN parts p ON jcp.part_id = p.id
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE jcp.job_card_id = ANY($1)`,
      [jobCardIds]
    );

    // Frequency: count jobs by status over time
    const freqResult = await query(
      `SELECT status, COUNT(*) AS count FROM job_cards
       WHERE id = ANY($1) GROUP BY status`,
      [jobCardIds]
    );

    res.json({
      success: true,
      data: {
        brand,
        model,
        totalJobs: jobCardIds.length,
        parts: partsResult.rows,
        suppliers: suppliersResult.rows,
        frequency: freqResult.rows,
      },
    });
  } catch (err) { next(err); }
};