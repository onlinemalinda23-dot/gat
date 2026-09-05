/**
 * Seed script - creates default users (with real bcrypt hashes),
 * suppliers, customers, vehicles, sample parts and an app version row.
 * Every statement is idempotent (ON CONFLICT / row-count checks).
 *
 * Works on both drivers managed by src/config/db.js:
 *   - postgres (production) : real PostgreSQL
 *   - sqlite/local (dev)     : embedded PostgreSQL via PGlite
 *
 * Usage: node scripts/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Admin@123';

async function run() {
  try {
    console.log(`Seeding database (driver: ${db.driver})`);

    await db.withTransaction(async (tx) => {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

      // Default users (created only when DB is empty of users)
      const users = [
        { full_name: 'Wasantha', email: 'admin@workshop.com', phone: '+10000000000', role: 'admin' },
        { full_name: 'John Mechanic', email: 'mechanic@workshop.com', phone: '+10000000001', role: 'mechanic' },
        { full_name: 'Sam Storekeeper', email: 'store@workshop.com', phone: '+10000000002', role: 'store_keeper' },
      ];

      const userCount = await tx.query('SELECT COUNT(*) FROM users');
      if (Number(userCount.rows[0].count) === 0) {
        for (const u of users) {
          await tx.query(
            'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5)',
            [u.full_name, u.email, u.phone, hash, u.role]
          );
        }
        console.log('Seeded users (password:', DEFAULT_PASSWORD + ')');
      } else {
        console.log('Users already exist - skipping user seed.');
      }

      // Suppliers
      await tx.query(`
        INSERT INTO suppliers (name, contact_number, address, email) VALUES
          ('AutoParts Traders', '+10000000010', '123 Market Street', 'sales@autoparts.example'),
          ('Universal Motors',  '+10000000011', '456 Industrial Road', 'hello@universalmotors.example'),
          ('Prime Components',  '+10000000012', '789 Supply Lane', 'orders@primecomponents.example')
        ON CONFLICT DO NOTHING
      `);

      // Customers
      await tx.query(`
        INSERT INTO customers (name, phone, address, email) VALUES
          ('Ahmed Hassan', '+10000000020', '12 Lake Road', 'ahmed@example.com'),
          ('Maria Silva',  '+10000000021', '34 Garden Avenue', 'maria@example.com')
        ON CONFLICT DO NOTHING
      `);

      // Vehicles (only if not present)
      const vehicleCount = await tx.query('SELECT COUNT(*) FROM vehicles');
      if (Number(vehicleCount.rows[0].count) === 0) {
        await tx.query(`
          INSERT INTO vehicles (customer_id, vehicle_number, brand, model, year, chassis_number, engine_number, mileage, fuel_type)
          SELECT c.id, 'ABC-123', 'Toyota', 'Aqua',    2018, 'CH-SAMPLE-1', 'ENG-SAMPLE-1', 45200, 'hybrid'::fuel_type
          FROM customers c WHERE c.name = 'Ahmed Hassan'
          UNION ALL
          SELECT c.id, 'XYZ-789', 'Honda',  'Civic',   2020, 'CH-SAMPLE-2', 'ENG-SAMPLE-2', 28000, 'petrol'::fuel_type
          FROM customers c WHERE c.name = 'Maria Silva'
        `);
      }

      // Sample parts
      await tx.query(`
        INSERT INTO parts (name, part_number, category, supplier_id, purchase_price, selling_price, quantity, low_stock_threshold)
        SELECT 'Brake Pads (Front)', 'BP-1001', 'Braking', s.id, 25.00, 45.00, 40, 10 FROM suppliers s WHERE s.name = 'AutoParts Traders'
        UNION ALL
        SELECT 'Oil Filter',         'OF-2001', 'Filters', s.id, 8.00, 15.00, 60, 15 FROM suppliers s WHERE s.name = 'Universal Motors'
        UNION ALL
        SELECT 'Spark Plug',         'SP-3001', 'Ignition', s.id, 4.00, 9.00, 120, 30 FROM suppliers s WHERE s.name = 'Prime Components'
        UNION ALL
        SELECT 'Timing Belt Kit',    'TB-4001', 'Engine', s.id, 60.00, 110.00, 10, 5  FROM suppliers s WHERE s.name = 'AutoParts Traders'
        UNION ALL
        SELECT 'Shock Absorber',     'SA-5001', 'Suspension', s.id, 35.00, 65.00, 8, 5 FROM suppliers s WHERE s.name = 'Universal Motors'
        UNION ALL
        SELECT 'Battery 12V 60Ah',   'BT-6001', 'Electrical', s.id, 55.00, 95.00, 18, 6 FROM suppliers s WHERE s.name = 'Prime Components'
        ON CONFLICT (part_number) DO NOTHING
      `);

      // Sample job card
      const jcCount = await tx.query('SELECT COUNT(*) FROM job_cards');
      if (Number(jcCount.rows[0].count) === 0) {
        await tx.query(`
          INSERT INTO job_cards (job_card_number, customer_id, vehicle_id, mechanic_id, complaint, inspection_notes, status)
          SELECT 'JC-100001', cu.id, v.id, u.id,
                 'Engine vibration and low pickup, warning light on dashboard',
'Full engine diagnostic needed. Consider timing belt check.',
               'checking'::job_status
          FROM customers cu
          JOIN vehicles v ON v.customer_id = cu.id AND v.vehicle_number = 'ABC-123'
          JOIN users u ON u.email = 'mechanic@workshop.com'
          LIMIT 1
          ON CONFLICT (job_card_number) DO NOTHING
        `);
      }

      // Sample app version row (used by the mobile version check)
      await tx.query(`
        INSERT INTO app_versions (platform, latest_version, min_version, update_url, force_update, release_notes)
        VALUES ('android', '1.0.0', '1.0.0', '', false, 'Initial release')
        ON CONFLICT DO NOTHING
      `);
    });

    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

run();