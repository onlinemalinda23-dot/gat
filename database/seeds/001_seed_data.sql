-- =============================================================
-- Seed Data - Vehicle Repair Management System
-- NOTE: Password hashes below are for bcrypt hash of "password"
-- =============================================================

-- Default users
-- password hash corresponds to bcrypt('Admin@123') style; replaced at runtime by seed script
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
    ('Wasantha', 'admin@workshop.com', '+10000000000', '$2b$10$PLACEHOLDER', 'admin'),
    ('John Mechanic',   'mechanic@workshop.com', '+10000000001', '$2b$10$PLACEHOLDER', 'mechanic'),
    ('Sam Storekeeper', 'store@workshop.com', '+10000000002', '$2b$10$PLACEHOLDER', 'store_keeper')
ON CONFLICT (email) DO NOTHING;

-- Sample suppliers
INSERT INTO suppliers (name, contact_number, address, email) VALUES
    ('AutoParts Traders', '+10000000010', '123 Market Street', 'sales@autoparts.example'),
    ('Universal Motors',  '+10000000011', '456 Industrial Road', 'hello@universalmotors.example'),
    ('Prime Components',  '+10000000012', '789 Supply Lane', 'orders@primecomponents.example')
ON CONFLICT DO NOTHING;

-- Sample customers
INSERT INTO customers (name, phone, address, email) VALUES
    ('Ahmed Hassan', '+10000000020', '12 Lake Road', 'ahmed@example.com'),
    ('Maria Silva',  '+10000000021', '34 Garden Avenue', 'maria@example.com'),
    ('Chen Wei',     '+10000000022', '56 Harbour Bay', 'chen@example.com')
ON CONFLICT DO NOTHING;

-- Sample vehicles
INSERT INTO vehicles (customer_id, vehicle_number, brand, model, year, chassis_number, engine_number, mileage, fuel_type)
SELECT c.id, 'ABC-123',  'Toyota', 'Aqua',    2018, 'CH-SAMPLE-1', 'ENG-SAMPLE-1', 45200, 'hybrid'  FROM customers c WHERE c.name = 'Ahmed Hassan'
UNION ALL
SELECT c.id, 'XYZ-789', 'Honda',  'Civic',   2020, 'CH-SAMPLE-2', 'ENG-SAMPLE-2', 28000, 'petrol'  FROM customers c WHERE c.name = 'Maria Silva'
UNION ALL
SELECT c.id, 'LMN-456', 'Toyota', 'Corolla', 2016, 'CH-SAMPLE-3', 'ENG-SAMPLE-3', 98000, 'petrol'  FROM customers c WHERE c.name = 'Chen Wei'
ON CONFLICT DO NOTHING;

-- Sample parts
INSERT INTO parts (name, part_number, category, supplier_id, purchase_price, selling_price, quantity, low_stock_threshold)
SELECT 'Brake Pads (Front)',   'BP-1001', 'Braking', s.id, 25.00, 45.00, 40, 10 FROM suppliers s WHERE s.name = 'AutoParts Traders'
UNION ALL
SELECT 'Oil Filter',           'OF-2001', 'Filters', s.id, 8.00, 15.00, 60, 15 FROM suppliers s WHERE s.name = 'Universal Motors'
UNION ALL
SELECT 'Spark Plug',           'SP-3001', 'Ignition', s.id, 4.00, 9.00, 120, 30 FROM suppliers s WHERE s.name = 'Prime Components'
UNION ALL
SELECT 'Timing Belt Kit',      'TB-4001', 'Engine', s.id, 60.00, 110.00, 10, 5 FROM suppliers s WHERE s.name = 'AutoParts Traders'
UNION ALL
SELECT 'Shock Absorber',       'SA-5001', 'Suspension', s.id, 35.00, 65.00, 8, 5 FROM suppliers s WHERE s.name = 'Universal Motors'
UNION ALL
SELECT 'Battery 12V 60Ah',     'BT-6001', 'Electrical', s.id, 55.00, 95.00, 18, 6 FROM suppliers s WHERE s.name = 'Prime Components'
ON CONFLICT (part_number) DO NOTHING;

-- Sample job card (received status)
INSERT INTO job_cards (job_card_number, customer_id, vehicle_id, mechanic_id, complaint, inspection_notes, status)
SELECT 'JC-100001',
       cu.id,
       v.id,
       u.id,
       'Engine vibration and low pickup, warning light on dashboard',
       'Full engine diagnostic needed. Consider timing belt check.',
       'checking'
FROM customers cu
JOIN vehicles v ON v.customer_id = cu.id AND v.vehicle_number = 'ABC-123'
JOIN users u ON u.email = 'mechanic@workshop.com'
LIMIT 1
ON CONFLICT (job_card_number) DO NOTHING;