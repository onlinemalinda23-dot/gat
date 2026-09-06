const { query } = require('../config/db');

/**
 * Notification service — abstraction over Push / SMS / WhatsApp.
 * Each method is a fire-and-forget integration point.
 * Real providers are plugged via environment variables.
 */

async function sendPushNotification({ customerId, vehicleId, jobCardId, title, message }) {
  // Store notification record
  const result = await query(
    `INSERT INTO notifications (customer_id, vehicle_id, job_card_id, title, message, channels, status)
     VALUES ($1,$2,$3,$4,$5,'push','pending') RETURNING id`,
    [customerId, vehicleId, jobCardId, title, message]
  );

  // TODO: If FCM service account is configured, send via Firebase Admin SDK here
  // The vehicle owner's device_token can be fetched from a customer_devices table
  // For now we just mark as sent (integration-ready placeholder)
  await query(`UPDATE notifications SET status='sent', sent_at=NOW() WHERE id=$1`, [result.rows[0].id]);
  return result.rows[0];
}

async function sendSMS({ customerId, phone, message }) {
  const result = await query(
    `INSERT INTO notifications (customer_id, title, message, channels, status)
     VALUES ($1,'SMS', $2, 'sms', 'pending') RETURNING id`,
    [customerId, message]
  );

  let token = process.env.TEXT_LK_API_TOKEN;
  let senderId = process.env.TEXT_LK_SENDER_ID;
  let status = 'failed';

  try {
    const settingsResult = await query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ($1, $2)', ['text_lk_api_token', 'text_lk_sender_id']);
    const settings = {};
    for (const row of settingsResult.rows) settings[row.setting_key] = row.setting_value;
    
    if (settings.text_lk_api_token) token = settings.text_lk_api_token;
    if (settings.text_lk_sender_id) senderId = settings.text_lk_sender_id;
  } catch (err) {
    console.warn('[SMS] Could not load settings from DB:', err.message);
  }

  if (token && senderId && phone) {
    try {
      let formattedPhone = phone.replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '94' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('94')) {
        formattedPhone = '94' + formattedPhone; // assume 94 prefix if not provided
      }

      const response = await fetch('https://app.text.lk/api/v3/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          recipient: formattedPhone,
          sender_id: senderId,
          type: 'plain',
          message: message
        })
      });

      const resData = await response.json();
      if (response.ok && (resData.status === 'success' || !resData.error)) {
        status = 'sent';
      } else {
        console.error('[SMS] Text.lk API Error:', resData);
      }
    } catch (err) {
      console.error('[SMS] Request failed:', err.message);
    }
  } else {
    console.warn('[SMS] Skipped: Missing API token, sender ID, or phone number');
  }

  await query(`UPDATE notifications SET status=$2, sent_at=NOW() WHERE id=$1`, [result.rows[0].id, status]);
  return result.rows[0];
}

async function sendWhatsApp({ customerId, phone, message }) {
  const result = await query(
    `INSERT INTO notifications (customer_id, title, message, channels, status)
     VALUES ($1,'WhatsApp', $2, 'whatsapp', 'pending') RETURNING id`,
    [customerId, message]
  );

  // TODO: WhatsApp Business API integration
  await query(`UPDATE notifications SET status='sent', sent_at=NOW() WHERE id=$1`, [result.rows[0].id]);
  return result.rows[0];
}

module.exports = { sendPushNotification, sendSMS, sendWhatsApp };