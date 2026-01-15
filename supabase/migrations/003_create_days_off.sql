-- Migration: Create days_off table for planned closures

create table if not exists days_off (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  reason text,
  created_at timestamp with time zone default now()
);

create unique index if not exists idx_days_off_date on days_off(date);
