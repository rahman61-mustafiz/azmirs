-- ============================================================================
-- Azmirs migration 05: granular production stages for orders.status
-- (plan ৪.৫ tracker: Confirmed → Measurement Received → Cutting → Stitching →
--  Embellishment → QC → Shipped). Idempotent.
-- HOW TO USE: Supabase SQL Editor -> paste -> Run.
-- ============================================================================

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (
  status in (
    'pending_advance','confirmed','measurement_received','cutting',
    'stitching','embellishment','qc','ready_to_ship','shipped',
    'delivered','cancelled'
  )
);
