-- Migration: enhancements
-- Run manually: psql -U postgres -d holiday_membership -f server/src/db/migrations/0001_enhancements.sql

-- 1. Add fixed_amount to voucher_value_type enum
ALTER TYPE voucher_value_type ADD VALUE IF NOT EXISTS 'fixed_amount';

-- 2. Add phone to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- 3. Add extended fields to packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS number_of_days INTEGER;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS itinerary TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS included TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS excluded TEXT;
