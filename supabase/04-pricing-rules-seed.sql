-- ============================================================================
-- Azmirs: pricing_rules seed — ⚠️ PLACEHOLDER numbers (2026-09-02)
-- Base prices are rough placeholders in the plan's everyday-tier range so the
-- order pipeline can be tested end-to-end. Replace with the real numbers by
-- running this file again with new values (a newer effective_from row wins).
-- vat_percent stays 0 until the business is VAT-registered (plan ৪.৪ flag).
-- ============================================================================

insert into pricing_rules (garment_type_id, base_stitching_price, vat_percent, transportation_flat)
select g.id, v.base, v.vat, v.transport
from garment_types g
join (values
  ('three_piece', 4500.00, 0, 120.00),
  ('khimar',      3500.00, 0, 120.00),
  ('hijab',       1200.00, 0, 120.00)
) as v(slug, base, vat, transport) on v.slug = g.slug;
