const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const search = req.query.search || '';

    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const result = await query(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, phone, role, is_active, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { full_name, phone, role, is_active } = req.body;
    const result = await query(
      `UPDATE users SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone),
       role = COALESCE($4, role), is_active = COALESCE($5, is_active)
       WHERE id = $1
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [req.params.id, full_name, phone, role, is_active]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    // Soft delete: deactivate instead of removing
    const result = await query('UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
};