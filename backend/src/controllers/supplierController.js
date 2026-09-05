const { query, withTransaction } = require('../config/db');
const { paginate } = require('../utils/helpers');

exports.listSuppliers = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const search = req.query.search || '';

    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $1 OR contact_number ILIKE $1 OR email ILIKE $1`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM suppliers ${where}`, params);
    const result = await query(
      `SELECT * FROM suppliers ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getSupplierById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const purchases = await query(
      'SELECT * FROM purchases WHERE supplier_id = $1 ORDER BY purchase_date DESC', [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], purchases: purchases.rows } });
  } catch (err) { next(err); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contact_number, address, email } = req.body;
    const result = await query(
      'INSERT INTO suppliers (name, contact_number, address, email) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, contact_number, address, email]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const { name, contact_number, address, email } = req.body;
    const result = await query(
      `UPDATE suppliers SET name = COALESCE($2,name), contact_number = COALESCE($3,contact_number),
       address = COALESCE($4,address), email = COALESCE($5,email)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, contact_number, address, email]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.removeSupplier = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) { next(err); }
};

exports.createPurchase = async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const { supplier_id, invoice_number, items, notes } = req.body;
      // items = [{ part_id, quantity, unit_cost }]

      if (!items || items.length === 0) {
        throw Object.assign(new Error('At least one item is required'), { isOperational: true });
      }

      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.quantity * item.unit_cost;
      }

      const purchaseResult = await client.query(
        `INSERT INTO purchases (supplier_id, invoice_number, total_amount, notes, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [supplier_id, invoice_number, totalAmount, notes, req.user.id]
      );
      const purchase = purchaseResult.rows[0];

      for (const item of items) {
        // Add purchase item
        await client.query(
          `INSERT INTO purchase_items (purchase_id, part_id, quantity, unit_cost, total_cost)
           VALUES ($1,$2,$3,$4,$5)`,
          [purchase.id, item.part_id, item.quantity, item.unit_cost, item.quantity * item.unit_cost]
        );

        // Update part stock
        const partResult = await client.query('SELECT quantity FROM parts WHERE id = $1', [item.part_id]);
        const currentQty = partResult.rows[0]?.quantity || 0;
        const newQty = currentQty + item.quantity;
        await client.query('UPDATE parts SET quantity = $2 WHERE id = $1', [item.part_id, newQty]);

        // Log inventory
        await client.query(
          `INSERT INTO inventory (part_id, operation, quantity_change, quantity_after, reference_type, reference_id, performed_by)
           VALUES ($1, 'purchase', $2, $3, 'purchase', $4, $5)`,
          [item.part_id, item.quantity, newQty, purchase.id, req.user.id]
        );
      }

      res.status(201).json({ success: true, data: purchase });
    });
  } catch (err) { next(err); }
};

exports.listPurchases = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const countResult = await query('SELECT COUNT(*) FROM purchases');
    const result = await query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p JOIN suppliers s ON p.supplier_id = s.id
       ORDER BY p.purchase_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getPurchaseById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const items = await query(
      `SELECT pi.*, pt.name AS part_name, pt.part_number
       FROM purchase_items pi JOIN parts pt ON pi.part_id = pt.id
       WHERE pi.purchase_id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
  } catch (err) { next(err); }
};