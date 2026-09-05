-- =============================================================
-- Migration 004: Warranty Tracking and Appointments
-- =============================================================

-- 1. Warranty Tracking
ALTER TABLE parts ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 0;
ALTER TABLE job_card_parts ADD COLUMN IF NOT EXISTS warranty_expires_at TIMESTAMPTZ;

-- 2. Appointments
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'arrived', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    scheduled_at  TIMESTAMPTZ NOT NULL,
    service_type  VARCHAR(200),
    notes         TEXT,
    status        appointment_status NOT NULL DEFAULT 'scheduled',
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments (customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (scheduled_at);

-- Drop trigger if exists to prevent errors during re-runs
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
