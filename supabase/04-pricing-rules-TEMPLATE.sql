-- ============================================================================
-- Azmirs: pricing_rules seed TEMPLATE — fill in the REAL numbers, then run.
-- Without a pricing rule per garment type, the API refuses orders on purpose
-- (no invented prices, ever).
--
-- base_stitching_price: BDT — base stitching INCLUDING fabric for now
--   (the separate fabric-rate model comes later, plan section ২.১)
-- vat_percent: keep 0 until the business is VAT-registered (plan ৪.৪ flag)
-- transportation_flat: BDT flat delivery charge
-- ============================================================================

insert into pricing_rules (garment_type_id, base_stitching_price, vat_percent, transportation_flat)
select g.id, v.base, v.vat, v.transport
from garment_types g
join (values
  ('three_piece', 0.00, 0, 0.00),   -- <-- ৩-পিসের বেস দাম বসাও
  ('khimar',      0.00, 0, 0.00),   -- <-- খিমারের বেস দাম বসাও
  ('hijab',       0.00, 0, 0.00)    -- <-- হিজাবের বেস দাম বসাও
) as v(slug, base, vat, transport) on v.slug = g.slug;
