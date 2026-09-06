const { query } = require('../config/db');

exports.getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = req.body; // e.g. { "text_lk_api_token": "abc", "text_lk_sender_id": "GAT" }
    
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO settings (setting_key, setting_value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    next(err);
  }
};
