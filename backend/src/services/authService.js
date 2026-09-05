const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const config = require('../config');

const SALT_ROUNDS = 12;

async function register({ full_name, email, phone, password, role }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('Email already registered');
    err.isOperational = true;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, full_name, email, role, is_active, created_at`,
    [full_name, email, phone, password_hash, role || 'mechanic']
  );

  const user = result.rows[0];
  const tokens = generateTokens(user.id, user.role);
  return { user, ...tokens };
}

async function login({ email, password }) {
  const result = await query(
    'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password');
    err.isOperational = true;
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];
  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.isOperational = true;
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.isOperational = true;
    err.statusCode = 401;
    throw err;
  }

  const tokens = generateTokens(user.id, user.role);
  const { password_hash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

async function refreshToken(token) {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (decoded.type !== 'refresh') {
    const err = new Error('Invalid refresh token');
    err.isOperational = true;
    throw err;
  }
  return generateTokens(decoded.userId, decoded.role);
}

function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  const refreshToken = jwt.sign({ userId, role, type: 'refresh' }, config.jwtSecret, { expiresIn: config.jwtRefreshExpiresIn });
  return { accessToken, refreshToken };
}

async function updateProfile(userId, { full_name, phone }) {
  const result = await query(
    `UPDATE users SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone)
     WHERE id = $1 RETURNING id, full_name, email, phone, role, is_active`,
    [userId, full_name, phone]
  );
  return result.rows[0];
}

async function changePassword(userId, oldPassword, newPassword) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.isOperational = true;
    throw err;
  }
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, hash]);
}

module.exports = { register, login, refreshToken, updateProfile, changePassword };