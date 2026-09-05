const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const search = req.query.search || '';

    let where = '';
    const params = [];
    if (search) {
      where = `WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM customers ${where}`, params);
    const result = await query(
      `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    const vehicles = await query('SELECT * FROM vehicles WHERE customer_id = $1', [req.params.id]);
    res.json({ success: true, data: { ...result.rows[0], vehicles: vehicles.rows } });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, phone, address, email } = req.body;
    const result = await query(
      'INSERT INTO customers (name, phone, address, email) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone, address, email]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, phone, address, email } = req.body;
    const result = await query(
      `UPDATE customers SET name = COALESCE($2,name), phone = COALESCE($3,phone),
       address = COALESCE($4,address), email = COALESCE($5,email)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, phone, address, email]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) { next(err); }
};