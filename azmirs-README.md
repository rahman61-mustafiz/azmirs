# Azmirs — Made-to-Order Custom Dress Studio

Azmirs is a made-to-order (configure-to-order) dress e-commerce platform. Customers pick a fabric print design and garment type (3-piece, Khimar, Hijab), choose one of 5 pre-made photorealistic style photos for that design, select a lace swatch, and place a made-to-order request — sized either from a courier-sent reference garment or a measurement form. There is no ready-stock inventory; every order is produced after purchase.

## How the catalog works

Each fabric print × garment type combination gets exactly 5 pre-generated style-catalog photos, built ahead of time through a two-step AI pipeline:

1. **Flat mockup** — Google Gemini (Nano Banana Pro) generates a clean photographic flat-lay from a structured style spec (neck, sleeve, length, closure, etc.) combined with the chosen fabric print.
2. **On-model render** — FASHN AI's Product-to-Model converts that flat mockup into a photorealistic on-model photo.

Customers browse and pick from these 5 ready photos — there is no live, real-time garment configurator on the site.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, deployed on Vercel |
| Backend / API | NestJS, deployed on Railway |
| Database | Supabase (Postgres), with Row-Level Security — catalog tables public read-only, transactional tables (customers/orders) backend-only via service role key |
| Image generation | Google Gemini (flat mockups) + FASHN AI (on-model photorealistic renders) |

## Brand

- Primary color: Navy `#1B2A4A`
- Accent: Rose Gold `#C08E6F`
- Sparing foil accent: Warm Gold `#C9A227` (logo/rare highlights only)
- Base: Ivory `#FBF8F4`, with sand/ink neutrals for borders and text
- **Bangla text must never use the "Hind Siliguri" font**, on this or any other Azmirs surface.

## Status

🚧 In active development. Business plan, garment option specs, color system, and the style-photo generation workflow are finalized. Database schema is drafted. Site build is starting.

## Related docs

- `azmirs-custom-dress-plan.md` — full business + tech plan
- `azmirs-supabase-schema.sql` — database schema (Draft v2)
- `azmirs-migration-v2-style-photos.sql` — migration adding the style-photo catalog model
