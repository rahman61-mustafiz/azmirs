-- ============================================================================
-- Azmirs migration 03: v1 -> v2 cleanup + catalog seed
-- Prepared: 2026-09-02
-- HOW TO USE: Supabase Dashboard -> SQL Editor -> paste whole file -> Run.
-- Idempotent: safe to run more than once.
--
-- Live DB state before this: v1 schema + 02-migration (style photos).
-- This brings it in line with schema v2: puthi/stone dropped entirely.
-- ============================================================================

-- 1. Drop puthi/stone completely (business decision, 2026-09-01, final)
alter table orders drop column if exists puthi_option_id;
alter table orders drop column if exists puthi_price;
drop table if exists puthi_stone_options;

-- 2. Seed colorways for "নীল বাগান" (design already seeded by migration 02)
insert into design_colorways (fabric_design_id, name, thumbnail_url, sort_order)
select d.id, v.name, v.thumb, v.sort
from fabric_designs d,
     (values
       ('নেভি',   'https://azmirs.com/assets/step-1-print.jpg', 0)
     ) as v(name, thumb, sort)
where d.name = 'নীল বাগান'
  and not exists (
    select 1 from design_colorways c
    where c.fabric_design_id = d.id and c.name = v.name
  );

-- 3. Seed the second real design: "রানি প্যানেল" (engineered panel)
insert into fabric_designs (name, print_type, design_source, base_fabric_type, status)
select 'রানি প্যানেল', 'engineered_panel', 'atif', 'cotton', 'active'
where not exists (select 1 from fabric_designs where name = 'রানি প্যানেল');

insert into design_colorways (fabric_design_id, name, thumbnail_url, sort_order)
select d.id, v.name, v.thumb, v.sort
from fabric_designs d,
     (values
       ('ম্যাজেন্টা', 'https://azmirs.com/assets/panel-magenta.jpg', 0),
       ('ধূসর',      'https://azmirs.com/assets/panel-grey.jpg',    1)
     ) as v(name, thumb, sort)
where d.name = 'রানি প্যানেল'
  and not exists (
    select 1 from design_colorways c
    where c.fabric_design_id = d.id and c.name = v.name
  );

-- 4. Garment compatibility
--    নীল বাগান (allover repeat): all three garment types
--    রানি প্যানেল (engineered panel): Khimar + Hijab only (panel prints
--    do not tile freely, so no 3-piece — plan section ২.২)
insert into fabric_design_garment_compatibility (fabric_design_id, garment_type_id)
select d.id, g.id
from fabric_designs d
join garment_types g on (
  (d.name = 'নীল বাগান')
  or (d.name = 'রানি প্যানেল' and g.slug in ('khimar','hijab'))
)
where not exists (
  select 1 from fabric_design_garment_compatibility x
  where x.fabric_design_id = d.id and x.garment_type_id = g.id
);

-- NOTE: lace_options stays empty on purpose. Real lace names and per-gojo
-- prices come from the physical sampling work; the UI shows an honest
-- "লেইস অপশন যোগ হচ্ছে" state until then. No invented prices in the DB.
