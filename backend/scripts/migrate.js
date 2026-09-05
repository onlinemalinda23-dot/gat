/**
 * Database migration runner.
 * Applies .sql files from a migrations directory in filename order and
 * tracks applied files in the schema_migrations table (idempotent).
 *
 * Works on both drivers managed by src/config/db.js:
 *   - postgres (production) : real PostgreSQL
 *   - sqlite/local (dev)     : embedded PostgreSQL via PGlite (no install)
 *
 * Usage: node scripts/migrate.js   [--dir ../database/migrations]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const args = process.argv.slice(2);
const dirFlag = args.find((a) => a.startsWith('--dir='));
const migrationsDir = path.resolve(__dirname, '..', dirFlag ? dirFlag.split('=')[1] : '../database/migrations');

async function run() {
  try {
    await db.runSql(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id SERIAL PRIMARY KEY,
         filename VARCHAR(255) NOT NULL UNIQUE,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    const applied = new Set();
    const existing = await db.query('SELECT filename FROM schema_migrations');
    for (const row of existing.rows) applied.add(row.filename);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`DB driver: ${db.driver} | schema_migrations tracked (${applied.size} applied)`);

    let pending = 0;
    for (const f of files) {
      if (applied.has(f)) {
        console.log(`  SKIP  ${f} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      await db.runSql(sql);
      await db.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      console.log(`  APPLY ${f}`);
      pending++;
    }

    if (pending === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Applied ${pending} migration(s).`);
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

run();