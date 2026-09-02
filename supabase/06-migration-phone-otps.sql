-- ============================================================================
-- Azmirs migration 06: phone OTP storage (order confirmation, plan ৪.১ step 9)
-- Backend-only table: RLS enabled with zero policies, service_role writes.
-- Idempotent. HOW TO USE: Supabase SQL Editor -> paste -> Run.
-- ============================================================================

create table if not exists phone_otps (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,
  code_hash    text not null,            -- sha256 of the 6-digit code
  expires_at   timestamptz not null,
  verified_at  timestamptz,
  attempts     int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_phone_otps_phone on phone_otps(phone, created_at desc);

alter table phone_otps enable row level security;
