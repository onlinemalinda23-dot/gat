const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// Reverse-proxy aware (needed behind load balancers on cloud hosts)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Body parsing (cap payload size)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// CORS - restrict to dashboard origins in production
app.use(
  cors({
    origin: config.nodeEnv === 'production'
      ? config.corsOrigins.length
        ? config.corsOrigins
        : true
      : true,
    credentials: true,
  })
);

// Request logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', { stream: { write: (m) => logger.info(m.trim()) } }));

// Global rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  })
);

// Health check (no auth) - used by load balancers / uptime monitors
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// API routes with version prefix: /api/v1/...
app.use(`/api/${config.apiVersion}`, apiRoutes);

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler
app.use(errorHandler);

module.exports = app;