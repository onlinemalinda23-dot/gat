require('dotenv').config();
const app = require('./app');
const config = require('./config');
const { pool } = require('./config/db');
const logger = require('./config/logger');

async function start() {
  // Verify DB connectivity before serving traffic
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS now');
    client.release();
    logger.info(`Database connected (server time: ${res.rows[0].now.toISOString()})`);
  } catch (err) {
    logger.error('Database connection failed - shutting down.', { message: err.message });
    process.exit(1);
  }

  const server = app.listen(config.port, config.host, () => {
    logger.info(`API listening on http://${config.host}:${config.port}/api/${config.apiVersion}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();