require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 8080,
  host: process.env.HOST || '0.0.0.0',
  apiVersion: process.env.API_VERSION || 'v1',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  fcmServerKey: process.env.FCM_SERVER_KEY,
  fcmProjectId: process.env.FCM_PROJECT_ID,
  fcmServiceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  whatsappApiToken: process.env.WHATSAPP_API_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;