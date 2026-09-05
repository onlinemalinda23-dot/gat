const { query } = require('../config/db');

/** Public endpoint used by the Android app for update checks. */
exports.getVersion = async (req, res, next) => {
  try {
    const platform = req.query.platform || 'android';
    const result = await query(
      `SELECT platform, latest_version, min_version, update_url, force_update, release_notes
       FROM app_versions
       WHERE platform = $1 AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [platform]
    );

    res.json({
      success: true,
      data: result.rows[0]
        ? result.rows[0]
        : { platform, latest_version: '1.0.0', min_version: '1.0.0', update_url: '', force_update: false },
    });
  } catch (err) { next(err); }
};