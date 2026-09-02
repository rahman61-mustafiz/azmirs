import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Catalog reads only, via the anon key. RLS keeps order/customer tables closed;
   every write goes through the backend, never from the browser. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export type GarmentType = {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  sort_order: number;
};

export type FabricDesign = {
  id: string;
  name: string;
  print_type: "allover_repeat" | "engineered_panel";
  base_fabric_type: string;
};

export type Colorway = {
  id: string;
  fabric_design_id: string;
  name: string;
  thumbnail_url: string | null;
  sort_order: number;
};

export type Compatibility = {
  fabric_design_id: string;
  garment_type_id: string;
};

export type DesignStylePhoto = {
  id: string;
  fabric_design_id: string;
  garment_type_id: string;
  photo_url: string;
  flat_mockup_url: string | null;
  cutting_spec: Record<string, string>;
  style_notes: string | null;
  sort_order: number;
};
