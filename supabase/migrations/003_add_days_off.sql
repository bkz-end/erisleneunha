-- Migration: Add days_off table for vacation/holiday management
-- This allows the admin to mark specific dates as unavailable

CREATE TABLE IF NOT EXISTS days_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_days_off_date ON days_off(date);
