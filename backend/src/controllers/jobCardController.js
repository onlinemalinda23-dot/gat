const { query, withTransaction } = require('../config/db');
const { paginate, generateJobCardNumber } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, offset, meta } = paginate(null, req.query.page, req.query.limit);
    const status = req.query.status;
    const search = req.query.search || '';

    const params = [];
    let where = '';

    if (status) {
      params.push(status);
      where += ` WHERE j.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += where ? ` AND` : ` WHERE`;
      where += ` (j.job_card_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR v.vehicle_number ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM job_cards j
       JOIN customers c ON j.customer_id = c.id
       JOIN vehicles v ON j.vehicle_id = v.id${where}`, params
    );

    const result = await query(
      `SELECT j.*, c.name AS customer_name, c.phone AS customer_phone,
              v.vehicle_number, v.brand, v.model,
              u.full_name AS mechanic_name
       FROM job_cards j
       JOIN customers c ON j.customer_id = c.id
       JOIN vehicles v ON j.vehicle_id = v.id
       LEFT JOIN users u ON j.mechanic_id = u.id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: result.rows, meta: meta(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT j.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              v.vehicle_number, v.brand, v.model, v.year, v.chassis_number, v.engine_number, v.mileage,
              u.full_name AS mechanic_name
       FROM job_cards j
       JOIN customers c ON j.customer_id = c.id
       JOIN vehicles v ON j.vehicle_id = v.id
       LEFT JOIN users u ON j.mechanic_id = u.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Job card not found' });

    const parts = await query(
      `SELECT jcp.*, p.name AS part_name, p.part_number, p.warranty_months
       FROM job_card_parts jcp JOIN parts p ON jcp.part_id = p.id
       WHERE jcp.job_card_id = $1`, [req.params.id]
    );
    const labour = await query('SELECT * FROM labour_charges WHERE job_card_id = $1', [req.params.id]);
    const notes = await query(
      `SELECT rn.*, u.full_name AS user_name
       FROM repair_notes rn LEFT JOIN users u ON rn.user_id = u.id
       WHERE rn.job_card_id = $1 ORDER BY rn.created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...result.rows[0], parts: parts.rows, labourCharges: labour.rows, notes: notes.rows },
    });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { customer_id, vehicle_id, mechanic_id, complaint, inspection_notes, expected_date, notes, mileage_in, fuel_level, customer_belongings, received_at } = req.body;

    // Generate unique job card number
    const seqResult = await query('SELECT COUNT(*) FROM job_cards');
    const jobCardNumber = generateJobCardNumber(Number(seqResult.rows[0].count) + 1);

    const result = await query(
      `INSERT INTO job_cards (job_card_number, customer_id, vehicle_id, mechanic_id, complaint, inspection_notes, expected_date, notes, created_by, mileage_in, fuel_level, customer_belongings, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13, NOW())) RETURNING *`,
      [jobCardNumber, customer_id, vehicle_id, mechanic_id || null, complaint, inspection_notes || null, expected_date || null, notes || null, req.user.id, mileage_in || null, fuel_level || null, customer_belongings || null, received_at || null]
    );

    const jobCard = result.rows[0];

    // Update vehicle mileage if provided
    if (mileage_in) {
      try {
        await query('UPDATE vehicles SET mileage = GREATEST(COALESCE(mileage, 0), $1) WHERE id = $2', [mileage_in, vehicle_id]);
      } catch (_) { /* non-critical */ }
    }

    // Send "vehicle received" notification
    try {
      const vNumRes = await query(
        'SELECT v.vehicle_number, c.phone FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id=$1',
        [vehicle_id]
      );
      const vNum = vNumRes.rows[0]?.vehicle_number || 'your vehicle';
      const phone = vNumRes.rows[0]?.phone;
      const msg = `Your vehicle ${vNum} has been received for inspection. Job Card: ${jobCardNumber}`;

      await notificationService.sendPushNotification({
        customerId: customer_id,
        vehicleId: vehicle_id,
        jobCardId: jobCard.id,
        title: 'Vehicle Received',
        message: msg,
      });

      if (phone) {
        await notificationService.sendSMS({
          customerId: customer_id,
          phone: phone,
          message: msg,
        });
      }
    } catch (err) { console.error('[Notification]', err); }

    res.status(201).json({ success: true, data: jobCard });
  } catch (err) {
    if (err.code === '23505') {
      err.message = 'Job card number already exists';
      err.isOperational = true;
    }
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const extraCols = {};
    if (status === 'completed') extraCols.completed_at = 'NOW()';
    if (status === 'delivered') extraCols.delivered_at = 'NOW()';

    let setClause = 'status = $2';
    const params = [req.params.id, status];
    let idx = 2;

    if (extraCols.completed_at) {
      idx++;
      setClause += `, completed_at = ${extraCols.completed_at}`;
    }
    if (extraCols.delivered_at) {
      idx++;
      setClause += `, delivered_at = ${extraCols.delivered_at}`;
    }

    const result = await query(
      `UPDATE job_cards SET ${setClause} WHERE id = $1 RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Job card not found' });

    const jc = result.rows[0];

    // Send status update notification
    try {
      const vNumRes = await query(
        'SELECT v.vehicle_number, c.phone FROM vehicles v JOIN customers c ON v.customer_id = c.id WHERE v.id=$1',
        [jc.vehicle_id]
      );
      const vNum = vNumRes.rows[0]?.vehicle_number || 'your vehicle';
      const phone = vNumRes.rows[0]?.phone;
      const statusMessages = {
        received: `Your vehicle ${vNum} has been received.`,
        checking: `Your vehicle ${vNum} is being inspected.`,
        waiting_parts: `Your vehicle ${vNum} is waiting for parts.`,
        repairing: `Your vehicle ${vNum} repair is in progress.`,
        completed: `Your vehicle ${vNum} repair has been completed!`,
        delivered: `Your vehicle ${vNum} has been delivered.`,
      };
      const msg = statusMessages[status] || `Status updated to ${status}`;

      await notificationService.sendPushNotification({
        customerId: jc.customer_id,
        vehicleId: jc.vehicle_id,
        jobCardId: jc.id,
        title: 'Repair Update',
        message: msg,
      });

      if (phone) {
        await notificationService.sendSMS({
          customerId: jc.customer_id,
          phone: phone,
          message: msg,
        });
      }
    } catch (err) { console.error('[Notification]', err); }

    // Build repair history on completion
    if (status === 'completed') {
      try {
        const partsUsed = await query(
          `SELECT p.name, p.part_number, jcp.quantity, s.name AS supplier_name
           FROM job_card_parts jcp
           JOIN parts p ON jcp.part_id = p.id
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           WHERE jcp.job_card_id = $1`,
          [jc.id]
        );
        const partsNames = partsUsed.rows.map(p => p.name);
        const suppliersNames = [...new Set(partsUsed.rows.filter(p => p.supplier_name).map(p => p.supplier_name))];
        await query(
          `INSERT INTO repair_history (vehicle_id, job_card_id, customer_id, parts_used, suppliers_used, repair_date, summary)
           VALUES ($1,$2,$3,$4,$5,NOW(),$6)`,
          [jc.vehicle_id, jc.id, jc.customer_id, JSON.stringify(partsNames), JSON.stringify(suppliersNames), jc.complaint]
        );
      } catch (_) { /* non-critical */ }
    }

    res.json({ success: true, data: jc });
  } catch (err) { next(err); }
};

exports.updateDetails = async (req, res, next) => {
  try {
    const { mechanic_id, complaint, inspection_notes, expected_date, notes } = req.body;
    const result = await query(
      `UPDATE job_cards SET
        mechanic_id = COALESCE($2, mechanic_id),
        complaint = COALESCE($3, complaint),
        inspection_notes = COALESCE($4, inspection_notes),
        expected_date = COALESCE($5, expected_date),
        notes = COALESCE($6, notes)
       WHERE id = $1 RETURNING *`,
      [req.params.id, mechanic_id, complaint, inspection_notes, expected_date, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Job card not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const result = await query(
      'INSERT INTO repair_notes (job_card_id, user_id, note) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.id, note]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.addPart = async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const { part_id, quantity } = req.body;

      // Get part price and stock
      const partResult = await client.query('SELECT * FROM parts WHERE id = $1 AND is_active = TRUE', [part_id]);
      if (partResult.rows.length === 0) throw Object.assign(new Error('Part not found or inactive'), { isOperational: true });
      const part = partResult.rows[0];
      if (part.quantity < quantity) throw Object.assign(new Error(`Insufficient stock. Available: ${part.quantity}`), { isOperational: true });

      const unit_price = part.selling_price;
      const total_price = unit_price * quantity;

      let expires_at = null;
      if (part.warranty_months && part.warranty_months > 0) {
        const d = new Date();
        d.setMonth(d.getMonth() + part.warranty_months);
        expires_at = d.toISOString();
      }

      // Add to job card parts
      const jcPart = await client.query(
        `INSERT INTO job_card_parts (job_card_id, part_id, quantity, unit_price, total_price, warranty_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.params.id, part_id, quantity, unit_price, total_price, expires_at]
      );

      // Deduct inventory
      const newQty = part.quantity - quantity;
      await client.query('UPDATE parts SET quantity = $2 WHERE id = $1', [part_id, newQty]);
      await client.query(
        `INSERT INTO inventory (part_id, operation, quantity_change, quantity_after, reference_type, reference_id, performed_by)
         VALUES ($1, 'job_card_use', $2, $3, 'job_card', $4, $5)`,
        [part_id, -quantity, newQty, req.params.id, req.user.id]
      );

      // Update totals on job card
      await client.query(
        `UPDATE job_cards SET
          total_parts_cost = total_parts_cost + $2,
          grand_total = grand_total + $2
         WHERE id = $1`,
        [req.params.id, total_price]
      );

      res.status(201).json({ success: true, data: jcPart.rows[0] });
    });
  } catch (err) { next(err); }
};

exports.addLabour = async (req, res, next) => {
  try {
    const { description, amount } = req.body;
    const result = await query(
      `INSERT INTO labour_charges (job_card_id, description, amount) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, description, amount]
    );

    await query(
      `UPDATE job_cards SET
        total_labour_cost = total_labour_cost + $2,
        grand_total = grand_total + $2
       WHERE id = $1`,
      [req.params.id, amount]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM job_cards WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Job card not found' });
    res.json({ success: true, message: 'Job card deleted' });
  } catch (err) { next(err); }
};