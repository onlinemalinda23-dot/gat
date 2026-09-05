-- =============================================================
-- Vehicle Repair Management System - Initial Schema (PostgreSQL)
-- Version: 1.0
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE user_role AS ENUM ('admin', 'mechanic', 'store_keeper');
CREATE TYPE job_status AS ENUM ('received', 'checking', 'waiting_parts', 'repairing', 'completed', 'delivered');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'credit');
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'whatsapp');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng');
CREATE TYPE stock_operation AS ENUM ('purchase', 'job_card_use', 'manual_adjustment', 'sale', 'return');

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'mechanic',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    device_token  TEXT,                    -- For FCM push notifications
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- =============================================================
-- CUSTOMERS
-- =============================================================
CREATE TABLE customers (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(150) NOT NULL,
    phone      VARCHAR(20) NOT NULL,
    address    TEXT,
    email      VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers (name);
CREATE INDEX idx_customers_phone ON customers (phone);

-- =============================================================
-- VEHICLES
-- =============================================================
CREATE TABLE vehicles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) NOT NULL,
    brand         VARCHAR(100) NOT NULL,
    model         VARCHAR(100) NOT NULL,
    year          INTEGER,
    chassis_number VARCHAR(100),
    engine_number  VARCHAR(100),
    mileage       INTEGER,
    fuel_type     fuel_type,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, vehicle_number)
);

CREATE INDEX idx_vehicles_vehicle_number ON vehicles (vehicle_number);
CREATE INDEX idx_vehicles_brand_model ON vehicles (brand, model);
CREATE INDEX idx_vehicles_customer ON vehicles (customer_id);

-- =============================================================
-- SUPPLIERS
-- =============================================================
CREATE TABLE suppliers (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    address      TEXT,
    email        VARCHAR(150),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers (name);

-- =============================================================
-- PARTS (catalog)
-- =============================================================
CREATE TABLE parts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(200) NOT NULL,
    part_number    VARCHAR(100) NOT NULL UNIQUE,
    category       VARCHAR(100),
    supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
    quantity       INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_name ON parts (name);
CREATE INDEX idx_parts_category ON parts (category);
CREATE INDEX idx_parts_supplier ON parts (supplier_id);

-- =============================================================
-- INVENTORY / STOCK HISTORY
-- =============================================================
CREATE TABLE inventory (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id      UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    operation    stock_operation NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after  INTEGER NOT NULL,
    reference_type  VARCHAR(50),          -- 'purchase', 'job_card', 'manual'
    reference_id    UUID,
    notes        TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_part ON inventory (part_id);
CREATE INDEX idx_inventory_created ON inventory (created_at);

-- =============================================================
-- JOB CARDS
-- =============================================================
CREATE TABLE job_cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    mechanic_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    complaint       TEXT NOT NULL,
    inspection_notes TEXT,
    status          job_status NOT NULL DEFAULT 'received',
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_date   DATE,
    completed_at    TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    total_parts_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_labour_cost  DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_cards_number ON job_cards (job_card_number);
CREATE INDEX idx_job_cards_customer ON job_cards (customer_id);
CREATE INDEX idx_job_cards_vehicle ON job_cards (vehicle_id);
CREATE INDEX idx_job_cards_mechanic ON job_cards (mechanic_id);
CREATE INDEX idx_job_cards_status ON job_cards (status);
CREATE INDEX idx_job_cards_received ON job_cards (received_at);

-- =============================================================
-- JOB CARD PARTS (parts used on a job)
-- =============================================================
CREATE TABLE job_card_parts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    part_id     UUID NOT NULL REFERENCES parts(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jcp_job_card ON job_card_parts (job_card_id);
CREATE INDEX idx_jcp_part ON job_card_parts (part_id);

-- =============================================================
-- LABOUR CHARGES
-- =============================================================
CREATE TABLE labour_charges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_labour_job_card ON labour_charges (job_card_id);

-- =============================================================
-- REPAIR NOTES (progress updates)
-- =============================================================
CREATE TABLE repair_notes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repair_notes_job_card ON repair_notes (job_card_id);

-- =============================================================
-- PURCHASES (from suppliers)
-- =============================================================
CREATE TABLE purchases (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id   UUID NOT NULL REFERENCES suppliers(id),
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoice_number VARCHAR(100),
    total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes         TEXT,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_supplier ON purchases (supplier_id);
CREATE INDEX idx_purchases_date ON purchases (purchase_date);

-- =============================================================
-- PURCHASE ITEMS
-- =============================================================
CREATE TABLE purchase_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id   UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    part_id       UUID NOT NULL REFERENCES parts(id),
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost     DECIMAL(12,2) NOT NULL,
    total_cost    DECIMAL(12,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id);
CREATE INDEX idx_purchase_items_part ON purchase_items (part_id);

-- =============================================================
-- INVOICES
-- =============================================================
CREATE TABLE invoices (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    job_card_id   UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    customer_id   UUID NOT NULL REFERENCES customers(id),
    vehicle_id    UUID NOT NULL REFERENCES vehicles(id),
    subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax           DECIMAL(12,2) NOT NULL DEFAULT 0,
    total         DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method payment_method,
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices (invoice_number);
CREATE INDEX idx_invoices_job_card ON invoices (job_card_id);
CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_status ON invoices (payment_status);

-- =============================================================
-- INVOICE ITEMS (line-level detail)
-- =============================================================
CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type   VARCHAR(20) NOT NULL,       -- 'part' | 'labour'
    part_id     UUID REFERENCES parts(id),
    description VARCHAR(200) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- =============================================================
-- PAYMENTS
-- =============================================================
CREATE TABLE payments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount        DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method        payment_method NOT NULL,
    reference     VARCHAR(100),
    received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments (invoice_id);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
CREATE TABLE notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id    UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    job_card_id   UUID REFERENCES job_cards(id) ON DELETE CASCADE,
    title         VARCHAR(150) NOT NULL,
    message       TEXT NOT NULL,
    channels      notification_channel NOT NULL DEFAULT 'push',
    status        notification_status NOT NULL DEFAULT 'pending',
    provider_ref  VARCHAR(255),             -- FCM message id / SMS id / WhatsApp id
    sent_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_customer ON notifications (customer_id);
CREATE INDEX idx_notifications_status ON notifications (status);

-- =============================================================
-- REPAIR HISTORY (denormalized quick-view snapshot per vehicle)
-- =============================================================
CREATE TABLE repair_history (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id   UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    job_card_id  UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    customer_id  UUID NOT NULL REFERENCES customers(id),
    parts_used   JSONB NOT NULL DEFAULT '[]',
    suppliers_used JSONB NOT NULL DEFAULT '[]',
    repair_date  TIMESTAMPTZ NOT NULL,
    summary      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repair_history_vehicle ON repair_history (vehicle_id);
CREATE INDEX idx_repair_history_date ON repair_history (repair_date);

-- =============================================================
-- TRIGGERS (updated_at auto-update)
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicles_updated_at  BEFORE UPDATE ON vehicles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_parts_updated_at     BEFORE UPDATE ON parts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_cards_updated_at BEFORE UPDATE ON job_cards  FOR EACH ROW EXECUTE FUNCTION set_updated_at();