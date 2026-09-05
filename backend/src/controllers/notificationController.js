const { query } = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const customerId = req.query.customer_id;

    const params = [];
    let where = '';
    if (customerId) {
      params.push(customerId);
      where = `WHERE n.customer_id = $${params.length}`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);
    const result = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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