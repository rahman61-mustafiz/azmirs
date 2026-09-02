import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* Service-role client: full read/write, RLS bypassed. This key lives ONLY in
   the API's environment (Railway env vars / apps/api/.env) and must never
   reach the frontend or the repo. */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from the environment',
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
