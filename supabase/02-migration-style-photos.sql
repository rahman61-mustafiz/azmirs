-- ============================================================================
-- Azmirs migration: v1 -> v2 (design_style_photos) + starter seed
-- Prepared: 2026-09-01
-- HOW TO USE: Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
-- Safe to run on the existing v1 database; it only ADDS things.
-- ============================================================================

-- 1. The style-photo catalog table (5 pre-made styles per design+garment)
create table if not exists design_style_photos (
  id                uuid primary key default gen_random_uuid(),
  fabric_design_id  uuid not null references fabric_designs(id) on delete cascade,
  garment_type_id   uuid not null references garment_types(id) on delete cascade,
  photo_url         text not null,
  flat_mockup_url   text,
  cutting_spec      jsonb not null default '{}'::jsonb,
  style_notes       text,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists idx_design_style_photos_design
  on design_style_photos(fabric_design_id, garment_type_id);

-- 2. RLS: public read-only for active rows (same rule as the other catalog tables)
alter table design_style_photos enable row level security;
drop policy if exists "public can read active design style photos" on design_style_photos;
create policy "public can read active design style photos"
  on design_style_photos for select
  using (is_active = true);

-- 3. Link orders to the chosen style photo
alter table orders add column if not exists
  style_photo_id uuid references design_style_photos(id);

-- 4. Starter seed: the three garment types (skips itself if already seeded)
insert into garment_types (slug, name_en, name_bn, sort_order)
select * from (values
  ('three_piece', '3-piece', '৩-পিস', 0),
  ('khimar',      'Khimar',  'খিমার', 1),
  ('hijab',       'Hijab',   'হিজাব', 2)
) as v(slug, name_en, name_bn, sort_order)
where not exists (select 1 from garment_types);

-- 5. Starter seed: the first fabric design (skips itself if already seeded)
insert into fabric_designs (name, print_type, design_source, base_fabric_type, status)
select 'নীল বাগান', 'allover_repeat', 'atif', 'cotton', 'active'
where not exists (select 1 from fabric_designs);

-- design_style_photos stays empty on purpose: the site shows the 5-slot grid
-- with "coming soon" placeholders until the Gemini + Fashn pipeline fills it.
