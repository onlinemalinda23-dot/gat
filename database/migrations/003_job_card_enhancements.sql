-- =============================================================
-- Migration: 003_job_card_enhancements
-- Description: Add mileage, fuel level, and belongings to job cards
-- =============================================================

ALTER TABLE job_cards 
ADD COLUMN mileage_in INTEGER,
ADD COLUMN fuel_level VARCHAR(20),
ADD COLUMN customer_belongings TEXT;
