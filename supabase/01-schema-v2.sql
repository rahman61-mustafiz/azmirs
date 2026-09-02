-- ============================================================================
-- Azmirs Custom Dress Studio — Supabase Database Schema (Draft v2)
-- Project: enauycnsthiummsmdorw (supabase.com/dashboard/project/enauycnsthiummsmdorw)
-- Prepared: 2026-09-01 | Revised: 2026-09-01 (v2 — পুঁথি/স্টোন সম্পূর্ণ বাদ,
--   design_style_photos table যোগ — ৫টা pre-made style-photo catalog মডেল)
--
-- HOW TO USE: paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- This creates all tables + relationships + RLS policies in one go.
-- ============================================================================

-- Extension for UUID generation
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. GARMENT TYPES  (3-piece / Khimar / Hijab)
-- ----------------------------------------------------------------------------
create table garment_types (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- e.g. 'three_piece', 'khimar', 'hijab'
  name_en       text not null,
  name_bn       text not null,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. FABRIC DESIGNS (print patterns) + COLORWAYS
-- ----------------------------------------------------------------------------
create table fabric_designs (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  print_type            text not null check (print_type in ('allover_repeat','engineered_panel')),
  design_source         text not null check (design_source in ('atif','ai_trend_generated')),
  base_fabric_type       text not null default 'cotton' check (base_fabric_type in ('cotton','silk')),
  status                text not null default 'draft' check (status in ('draft','active','archived')),
  notes                 text,
  created_at            timestamptz not null default now()
);

-- which garment types a design is allowed on (engineered/panel prints may not fit every type)
create table fabric_design_garment_compatibility (
  fabric_design_id  uuid not null references fabric_designs(id) on delete cascade,
  garment_type_id   uuid not null references garment_types(id) on delete cascade,
  primary key (fabric_design_id, garment_type_id)
);

create table design_colorways (
  id                uuid primary key default gen_random_uuid(),
  fabric_design_id  uuid not null references fabric_designs(id) on delete cascade,
  name              text not null,             -- e.g. "Rani Pink", "Emerald"
  thumbnail_url     text,                       -- small preview swatch/image
  texture_asset_url text,                       -- web-optimized tile/panel asset for the configurator canvas
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. LACE OPTIONS  [পুঁথি/স্টোন সম্পূর্ণ বাদ, ২০২৬-০৯-০১ — puthi_stone_options table removed]
-- ----------------------------------------------------------------------------
create table lace_options (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  price_per_gojo  numeric(10,2) not null,      -- BDT per gojo/yard
  image_url       text,                        -- swatch image (shown as-is, not composited on garment)
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3B. DESIGN STYLE PHOTOS  [নতুন, ২০২৬-০৯-০১]
-- প্রতিটা (fabric_design + garment_type) কম্বিনেশনের জন্য ৫টা pre-made
-- photorealistic style-photo — ১৬ সেকশনের workflow (Gemini flat mockup →
-- Fashn AI Product-to-Model) দিয়ে আগে থেকেই বানিয়ে রাখা হয়। Customer
-- checkout-এ এই ৫টা ready photo থেকে একটা বাছে; live/real-time কোনো
-- generation হয় না।
-- ----------------------------------------------------------------------------
create table design_style_photos (
  id                uuid primary key default gen_random_uuid(),
  fabric_design_id  uuid not null references fabric_designs(id) on delete cascade,
  garment_type_id   uuid not null references garment_types(id) on delete cascade,
  photo_url         text not null,             -- final Fashn AI on-model photorealistic render
  flat_mockup_url   text,                       -- optional: the intermediate Gemini flat-lay, for reference
  cutting_spec      jsonb not null default '{}'::jsonb,  -- internal spec used to generate this style: { neck, sleeve, length, bottom, edge_finish, ... } (references cutting_options categories)
  style_notes       text,                       -- optional internal notes (which 5 references were blended, what was mutated)
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. CUTTING OPTIONS (neck / sleeve / length / bottom / edge — per garment type)
-- ----------------------------------------------------------------------------
create table cutting_options (
  id               uuid primary key default gen_random_uuid(),
  garment_type_id  uuid not null references garment_types(id) on delete cascade,
  category         text not null check (category in ('neck','sleeve','length','bottom','edge_finish','face_opening','fabric_weight','size')),
  name_en          text not null,
  name_bn          text,
  image_url        text,
  is_active        boolean not null default true,
  sort_order       int not null default 0
);

-- ----------------------------------------------------------------------------
-- 5. MEASUREMENT FIELDS (per garment type — 3-piece vs Khimar vs Hijab differ)
-- ----------------------------------------------------------------------------
create table measurement_fields (
  id               uuid primary key default gen_random_uuid(),
  garment_type_id  uuid not null references garment_types(id) on delete cascade,
  field_key        text not null,               -- e.g. 'bust', 'waist', 'head_circumference'
  label_en         text not null,
  label_bn         text,
  unit             text not null default 'inch',
  is_required      boolean not null default true,
  sort_order       int not null default 0
);

-- ----------------------------------------------------------------------------
-- 6. PRICING RULES
-- ----------------------------------------------------------------------------
create table pricing_rules (
  id                    uuid primary key default gen_random_uuid(),
  garment_type_id       uuid not null references garment_types(id) on delete cascade,
  base_stitching_price  numeric(10,2) not null,   -- BDT
  vat_percent           numeric(5,2) not null default 0,
  transportation_flat   numeric(10,2),             -- flat fee, or null if calculated by delivery area
  effective_from        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. CUSTOMERS
-- ----------------------------------------------------------------------------
create table customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  phone_verified boolean not null default false,
  address       text,
  delivery_area text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. ORDERS
-- ----------------------------------------------------------------------------
create table orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text unique not null,      -- human-readable, e.g. AZM-2026-0001
  customer_id           uuid not null references customers(id),
  garment_type_id       uuid not null references garment_types(id),
  fabric_design_id      uuid not null references fabric_designs(id),
  colorway_id           uuid not null references design_colorways(id),
  style_photo_id        uuid references design_style_photos(id),  -- which of the 5 pre-made style photos the customer picked
  lace_option_id        uuid references lace_options(id),
  cutting_selections    jsonb not null default '{}'::jsonb,  -- snapshot of the chosen style photo's cutting_spec, for records
  sizing_method         text not null check (sizing_method in ('reference_garment','measurement_form')),
  measurement_data      jsonb,                      -- filled if sizing_method = 'measurement_form'
  reference_garment_courier_info jsonb,              -- filled if sizing_method = 'reference_garment'
  base_price            numeric(10,2) not null,
  fabric_price          numeric(10,2) not null default 0,
  lace_price            numeric(10,2) not null default 0,
  vat_amount            numeric(10,2) not null default 0,
  transportation_price  numeric(10,2) not null default 0,
  total_price           numeric(10,2) not null,
  advance_paid_percent  numeric(5,2) not null default 30,
  advance_paid_amount   numeric(10,2) not null default 0,
  remaining_cod_amount  numeric(10,2) not null default 0,
  status                text not null default 'pending_advance' check (
                          status in ('pending_advance','confirmed','in_production','ready_to_ship','shipped','delivered','cancelled')
                        ),
  expected_delivery_date date,
  created_at            timestamptz not null default now()
);

create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  status      text not null,
  note        text,
  changed_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helpful indexes
-- ----------------------------------------------------------------------------
create index idx_design_colorways_design on design_colorways(fabric_design_id);
create index idx_design_style_photos_design on design_style_photos(fabric_design_id, garment_type_id);
create index idx_cutting_options_garment on cutting_options(garment_type_id, category);
create index idx_measurement_fields_garment on measurement_fields(garment_type_id);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_order_status_history_order on order_status_history(order_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
--
-- Rule: catalog tables are public READ-ONLY (anon key can browse them for
-- the configurator to work). Transactional tables (customers/orders/
-- order_status_history) have NO public access at all — only the backend
-- (NestJS on Railway, using the service_role key, which bypasses RLS
-- entirely) can read or write them. This stops anyone from tampering with
-- price or reading other customers' orders via the browser's network tab,
-- since the backend recalculates and validates price server-side before
-- ever writing an order row.
-- ============================================================================

-- ---- Catalog tables: enable RLS + public read-only policy ----
alter table garment_types enable row level security;
create policy "public can read active garment types"
  on garment_types for select
  using (is_active = true);

alter table fabric_designs enable row level security;
create policy "public can read active fabric designs"
  on fabric_designs for select
  using (status = 'active');

alter table fabric_design_garment_compatibility enable row level security;
create policy "public can read design-garment compatibility"
  on fabric_design_garment_compatibility for select
  using (true);

alter table design_colorways enable row level security;
create policy "public can read active colorways"
  on design_colorways for select
  using (is_active = true);

alter table lace_options enable row level security;
create policy "public can read active lace options"
  on lace_options for select
  using (is_active = true);

alter table design_style_photos enable row level security;
create policy "public can read active design style photos"
  on design_style_photos for select
  using (is_active = true);

alter table cutting_options enable row level security;
create policy "public can read active cutting options"
  on cutting_options for select
  using (is_active = true);

alter table measurement_fields enable row level security;
create policy "public can read measurement fields"
  on measurement_fields for select
  using (true);

alter table pricing_rules enable row level security;
create policy "public can read pricing rules"
  on pricing_rules for select
  using (true);

-- ---- Transactional tables: RLS enabled, NO policies for anon/authenticated ----
-- (enabling RLS with zero policies = default-deny for anon/authenticated;
--  only the service_role key, used by the backend, can bypass RLS and access these)
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;

-- ============================================================================
-- NOTE: the policies above assume the frontend only ever calls Supabase
-- directly for catalog reads (anon key), and every order write goes through
-- your NestJS backend using the service_role key (never expose the
-- service_role key in frontend code). If you later add customer login
-- (Supabase Auth) so customers can view their own past orders, add a
-- targeted SELECT policy on `orders`/`customers` scoped to auth.uid() at
-- that time — not needed for the initial launch.
-- ============================================================================
