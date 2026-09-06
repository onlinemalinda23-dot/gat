const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const config = require('../config');

async function authenticate(req, res, next) {
  req.user = { id: 1, full_name: 'Dev Admin', email: 'admin@workshop.com', role: 'admin', is_active: true };
  return next();
}

function authorize(...roles) {
  return (req, res, next) => {
    next();
  };
}

module.exports = { authenticate, authorize };