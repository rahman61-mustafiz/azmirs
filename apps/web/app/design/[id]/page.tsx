import Link from "next/link";
import {
  supabase,
  type Colorway,
  type Compatibility,
  type FabricDesign,
  type GarmentType,
  type LaceOption,
} from "@/lib/supabase";
import DesignFlow from "@/components/DesignFlow";

export const revalidate = 300;

async function getData(id: string): Promise<{
  design: FabricDesign | null;
  colorways: Colorway[];
  garmentTypes: GarmentType[];
  laces: LaceOption[];
}> {
  if (!supabase) return { design: null, colorways: [], garmentTypes: [], laces: [] };
  const [designRes, colorwaysRes, typesRes, compatRes, lacesRes] = await Promise.all([
    supabase
      .from("fabric_designs")
      .select("id,name,print_type,base_fabric_type")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("design_colorways")
      .select("id,fabric_design_id,name,thumbnail_url,sort_order")
      .eq("fabric_design_id", id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("garment_types")
      .select("id,slug,name_en,name_bn,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("fabric_design_garment_compatibility")
      .select("fabric_design_id,garment_type_id")
      .eq("fabric_design_id", id),
    supabase
      .from("lace_options")
      .select("id,name,price_per_gojo,image_url")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const compat = (compatRes.data as Compatibility[]) ?? [];
  const allTypes = (typesRes.data as GarmentType[]) ?? [];
  /* Only compatible garment types are offered; a panel print, for example,
     may fit Khimar/Hijab but not a 3-piece (plan section ২.২). If no
     compatibility rows exist yet, offer nothing rather than guessing. */
  const garmentTypes = allTypes.filter((g) =>
    compat.some((c) => c.garment_type_id === g.id)
  );

  return {
    design: (designRes.data as FabricDesign) ?? null,
    colorways: (colorwaysRes.data as Colorway[]) ?? [],
    garmentTypes,
    laces: (lacesRes.data as LaceOption[]) ?? [],
  };
}

export default async function DesignDetailPage({ params }: PageProps<"/design/[id]">) {
  const { id } = await params;
  const { design, colorways, garmentTypes, laces } = await getData(id);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
      <Link href="/" className="font-en text-xs uppercase tracking-[0.14em] text-rosegold-deep">
        ← ক্যাটালগে ফিরুন
      </Link>

      {!design ? (
        <div className="mt-8 rounded-sm border border-sand/40 bg-card p-6">
          <h1 className="text-2xl">ডিজাইনটা পাওয়া যায়নি</h1>
          <p className="mt-2 text-sm text-inkmuted">লিংকটা পুরনো হতে পারে।</p>
        </div>
      ) : (
        <>
          <p className="mt-6 font-en text-[11px] uppercase tracking-[0.16em] text-rosegold-deep">
            {design.print_type === "engineered_panel" ? "Engineered panel" : "Allover repeat"} ·{" "}
            {design.base_fabric_type}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{design.name}</h1>

          <DesignFlow
            designId={design.id}
            designName={design.name}
            colorways={colorways}
            garmentTypes={garmentTypes}
            laces={laces}
          />
        </>
      )}
    </main>
  );
}
