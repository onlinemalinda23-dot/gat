/**
 * Unified database layer.
 *
 * Two drivers with the SAME public API:
 *
 *  - postgres (production/cloud): the `pg` connection pool.
 *  - sqlite/local (development): an embedded PostgreSQL compiled to WASM
 *    (@electric-sql/pglite). It runs the EXACT same SQL and schema as the
 *    production Postgres, but needs no PostgreSQL installation or running
 *    service, so the whole app can be developed/tested on a clean Windows PC.
 *
 * Driver selection (in priority order):
 *   1. DB_DRIVER=postgres | pg        -> PostgreSQL   (with DATABASE_URL or DB_*)
 *   2. DB_DRIVER=pglite | sqlite | local -> embedded Postgres (default)
 *   3. DATABASE_URL=postgres://...     -> PostgreSQL
 *   4. otherwise                       -> embedded Postgres (local dev)
 *
 * All callers keep using:
 *   const { query, withTransaction, pool } = require('../config/db');
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let driverName = null; // 'postgres' | 'sqlite'
let inner = null; // pg Pool | PGlite instance
let initPromise = null;

function detectDriver() {
  const driver = (process.env.DB_DRIVER || '').toLowerCase();
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  if (driver === 'postgres' || driver === 'pg') return 'postgres';
  if (driver === 'pglite' || driver === 'sqlite' || driver === 'local') return 'sqlite';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgres';
  return 'sqlite'; // zero-setup local default
}

function localDataDir() {
  const configured = process.env.SQLITE_PATH || '';
  if (configured === ':memory:') return ':memory:';
  if (process.env.VERCEL) return ':memory:'; // Vercel filesystem is read-only
  return path.resolve(__dirname, '..', '..', configured || '.localdb');
}

async function init() {
  if (driverName !== null) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const detected = detectDriver();
    if (detected === 'postgres') {
      driverName = 'postgres';
      const { Pool } = require('pg');
      const opts = {};
      if (process.env.DATABASE_URL) opts.connectionString = process.env.DATABASE_URL;
      if (process.env.DB_HOST) opts.host = process.env.DB_HOST;
      if (process.env.DB_PORT != null && process.env.DB_PORT !== '') opts.port = Number(process.env.DB_PORT);
      if (process.env.DB_NAME) opts.database = process.env.DB_NAME;
      if (process.env.DB_USER) opts.user = process.env.DB_USER;
      if (process.env.DB_PASSWORD != null) opts.password = process.env.DB_PASSWORD;
      if (process.env.DB_SSL === 'true') opts.ssl = { rejectUnauthorized: false };
      inner = new Pool(opts);
      inner.on('error', (err) => logger.error('[db] Unexpected error on idle client', err));
    } else {
      driverName = 'sqlite';
      const { PGlite } = require('@electric-sql/pglite');
      const dir = localDataDir();
      if (dir !== ':memory:') fs.mkdirSync(dir, { recursive: true });
      const start = Date.now();
      inner = new PGlite(dir === ':memory:' ? undefined : dir);
      await inner.waitReady;
      logger.info(`Embedded Postgres (PGlite) ready at ${dir} (${Date.now() - start} ms)`);
    }
  })();

  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
  return inner;
}

async function ensure() {
  return init();
}

async function query(text, params) {
  await ensure();
  if (driverName === 'postgres') {
    return inner.query(text, params);
  }
  // PGlite query(text, params) — $1 placeholders natively supported.
  return inner.query(text, params);
}

/**
 * Makes PostgreSQL DDL/DML compatible with the embedded (PGlite) build.
 * Applied ONLY for the local driver — production Postgres runs files verbatim.
 *  - uuid-ossp / pgcrypto contrib extensions are not bundled in PGlite;
 *    `gen_random_uuid()` is built into PostgreSQL 13+, so default columns
 *    keep working with identical behaviour.
 */
function sqliteCompat(sql) {
  return sql
    .replace(/^\s*CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+"?[\w-]+"?\s*;\s*$/gim, '')
    .replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');
}

async function runSql(text) {
  await ensure();
  if (driverName === 'postgres') {
    return inner.query(text);
  }
  // PGlite exec() runs multi-statement scripts (migration files).
  return inner.exec(sqliteCompat(text));
}

async function withTransaction(callback) {
  await ensure();
  if (driverName === 'postgres') {
    const client = await inner.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return inner.transaction(async (tx) => callback(tx));
}

/**
 * Pool-shaped facade so callers can keep using `pool.connect()` / `pool.end()`.
 */
const pool = {
  async connect() {
    await ensure();
    if (driverName === 'postgres') return inner.connect();
    return {
      query: (text, params) => inner.query(text, params),
      release: () => {},
    };
  },
  query: (text, params) => query(text, params),
  async end() {
    if (!inner) return;
    if (driverName === 'postgres') {
      return inner.end();
    }
    return inner.close();
  },
};

async function close() {
  return pool.end();
}

module.exports = {
  query,
  runSql,
  withTransaction,
  pool,
  close,
  get driver() {
    return driverName || detectDriver();
  },
  get dbName() {
    return driverName === 'postgres'
      ? process.env.DB_NAME || 'repair_workshop'
      : 'sqlite';
  },
};