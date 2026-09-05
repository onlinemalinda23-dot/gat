const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const search = req.query.search || '';
    const category = req.query.category;

    const params = [];
    const conditions = ['p.is_active = TRUE'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.part_number ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM parts p ${where}`, params);
    const result = await query(
      `SELECT p.*, s.name AS supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, s.name AS supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Part not found' });

    const history = await query(
      'SELECT * FROM inventory WHERE part_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], stockHistory: history.rows } });
  } catch (err) { next(err); }
};

exports.lowStock = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, s.name AS supplier_name
       FROM parts p LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.is_active = TRUE AND p.quantity <= p.low_stock_threshold
       ORDER BY p.quantity ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, part_number, category, supplier_id, purchase_price, selling_price, quantity, low_stock_threshold, warranty_months } = req.body;
    const result = await query(
      `INSERT INTO parts (name, part_number, category, supplier_id, purchase_price, selling_price, quantity, low_stock_threshold, warranty_months)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, part_number, category, supplier_id, purchase_price, selling_price, quantity || 0, low_stock_threshold || 5, warranty_months || 0]
    );

    // Log initial stock
    if (quantity && quantity > 0) {
      await query(
        `INSERT INTO inventory (part_id, operation, quantity_change, quantity_after, reference_type, notes, performed_by)
         VALUES ($1, 'purchase', $2, $2, 'manual', 'Initial stock', $3)`,
        [result.rows[0].id, quantity, req.user.id]
      );
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      err.message = 'Part number already exists';
      err.isOperational = true;
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, category, supplier_id, purchase_price, selling_price, low_stock_threshold, warranty_months } = req.body;
    const result = await query(
      `UPDATE parts SET
        name = COALESCE($2, name), category = COALESCE($3, category),
        supplier_id = COALESCE($4, supplier_id),
        purchase_price = COALESCE($5, purchase_price), selling_price = COALESCE($6, selling_price),
        low_stock_threshold = COALESCE($7, low_stock_threshold),
        warranty_months = COALESCE($8, warranty_months)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, category, supplier_id, purchase_price, selling_price, low_stock_threshold, warranty_months || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.addStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });

    const partResult = await query('SELECT * FROM parts WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (partResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Part not found' });

    const newQty = partResult.rows[0].quantity + quantity;
    await query('UPDATE parts SET quantity = $2 WHERE id = $1', [req.params.id, newQty]);
    await query(
      `INSERT INTO inventory (part_id, operation, quantity_change, quantity_after, reference_type, notes, performed_by)
       VALUES ($1, 'manual_adjustment', $2, $3, 'manual', 'Stock added', $4)`,
      [req.params.id, quantity, newQty, req.user.id]
    );

    res.json({ success: true, message: `Stock updated. New quantity: ${newQty}` });
  } catch (err) { next(err); }
};

exports.removeStock = async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });

    const partResult = await query('SELECT * FROM parts WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (partResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Part not found' });
    if (partResult.rows[0].quantity < quantity) {
      return res.status(400).json({ success: false, message: `Insufficient stock. Available: ${partResult.rows[0].quantity}` });
    }

    const newQty = partResult.rows[0].quantity - quantity;
    await query('UPDATE parts SET quantity = $2 WHERE id = $1', [req.params.id, newQty]);
    await query(
      `INSERT INTO inventory (part_id, operation, quantity_change, quantity_after, reference_type, notes, performed_by)
       VALUES ($1, 'manual_adjustment', -$2, $3, 'manual', $4, $5)`,
      [req.params.id, quantity, newQty, notes || 'Stock removed', req.user.id]
    );

    res.json({ success: true, message: `Stock updated. New quantity: ${newQty}` });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    // Soft delete: mark inactive instead of hard delete
    const result = await query('UPDATE parts SET is_active = FALSE WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, message: 'Part deactivated' });
  } catch (err) { next(err); }
};