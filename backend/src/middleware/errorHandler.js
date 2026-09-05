const logger = require('../config/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, url: req.originalUrl });

  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected error - do not leak internals
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}

module.exports = errorHandler;