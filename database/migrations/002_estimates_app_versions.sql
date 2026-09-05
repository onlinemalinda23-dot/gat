-- =============================================================
-- Migration 002: Estimates, App versions, Customer devices
-- =============================================================

-- Estimate approval status
DO $$ BEGIN
    CREATE TYPE estimate_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================
-- ESTIMATES
-- =============================================================
CREATE TABLE IF NOT EXISTS estimates (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_number  VARCHAR(50) NOT NULL UNIQUE,
    job_card_id      UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    customer_id      UUID NOT NULL REFERENCES customers(id),
    vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
    parts_cost       DECIMAL(12,2) NOT NULL DEFAULT 0,
    labour_cost      DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    total            DECIMAL(12,2) NOT NULL DEFAULT 0,
    status           estimate_status NOT NULL DEFAULT 'pending',
    valid_until      DATE,
    notes            TEXT,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimates_number   ON estimates (estimate_number);
CREATE INDEX IF NOT EXISTS idx_estimates_job_card ON estimates (job_card_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates (customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status   ON estimates (status);

-- =============================================================
-- ESTIMATE ITEMS (line-level: parts / labour)
-- =============================================================
CREATE TABLE IF NOT EXISTS estimate_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id   UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    item_type     VARCHAR(20) NOT NULL,          -- 'part' | 'labour'
    part_id       UUID REFERENCES parts(id) ON DELETE SET NULL,
    description   VARCHAR(200) NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    unit_price    DECIMAL(12,2) NOT NULL,
    total_price   DECIMAL(12,2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items (estimate_id);

-- =============================================================
-- APP VERSIONS (automatic update checks)
-- =============================================================
CREATE TABLE IF NOT EXISTS app_versions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform          VARCHAR(20) NOT NULL,          -- 'android' | 'ios'
    latest_version    VARCHAR(20) NOT NULL,          -- e.g. '1.2.0'
    min_version       VARCHAR(20) NOT NULL,          -- oldest supported
    update_url        VARCHAR(300),
    force_update      BOOLEAN NOT NULL DEFAULT FALSE,
    release_notes     TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions (platform) WHERE is_active = TRUE;

-- =============================================================
-- CUSTOMER DEVICES (FCM / push tokens per customer phone device)
-- =============================================================
CREATE TABLE IF NOT EXISTS customer_devices (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    device_token  TEXT NOT NULL,
    platform      VARCHAR(20) DEFAULT 'android',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_customer_devices_customer ON customer_devices (customer_id);

-- Trigger for estimates/app_versions updated_at
CREATE TRIGGER trg_estimates_updated_at
    BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_app_versions_updated_at
    BEFORE UPDATE ON app_versions FOR EACH ROW EXECUTE FUNCTION set_updated_at();