-- Migration: custom bookings + comments
-- Run in psql: psql -U postgres -d holiday_membership -f server/src/db/migrations/0002_custom_bookings.sql

CREATE TABLE IF NOT EXISTS custom_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination VARCHAR(255) NOT NULL,
  hotel_name VARCHAR(255),
  google_link TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  kids INTEGER NOT NULL DEFAULT 0,
  kid_ages TEXT,
  voucher_id UUID REFERENCES vouchers(id),
  status booking_status NOT NULL DEFAULT 'new_request',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  booking_type VARCHAR(20) NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_comments_booking ON booking_comments(booking_id, booking_type);
