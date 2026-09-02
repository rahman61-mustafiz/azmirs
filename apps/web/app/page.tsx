import Link from "next/link";
import { supabase, type Colorway, type FabricDesign } from "@/lib/supabase";

export const revalidate = 300;

type CatalogEntry = FabricDesign & { colorways: Colorway[] };

async function getCatalog(): Promise<CatalogEntry[] | null> {
  if (!supabase) return null;
  const [designsRes, colorwaysRes] = await Promise.all([
    supabase
      .from("fabric_designs")
      .select("id,name,print_type,base_fabric_type")
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase
      .from("design_colorways")
      .select("id,fabric_design_id,name,thumbnail_url,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);
  if (designsRes.error) return null;
  const colorways = (colorwaysRes.data as Colorway[]) ?? [];
  return ((designsRes.data as FabricDesign[]) ?? []).map((d) => ({
    ...d,
    colorways: colorways.filter((c) => c.fabric_design_id === d.id),
  }));
}

export default async function CatalogPage() {
  const catalog = await getCatalog();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6 sm:py-14">
      <p className="font-en text-xs uppercase tracking-[0.2em] text-rosegold-deep">
        Azmirs
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl">প্রিন্ট বাছুন</h1>
      <p className="mt-3 max-w-xl text-inkmuted">
        প্রতিটা প্রিন্ট আমাদের নিজেদের আঁকা। একটায় চাপ দিলে তার কালারওয়ে আর রেডি
        স্টাইলগুলো দেখতে পাবেন।
      </p>

      {catalog === null && (
        <div className="mt-10 rounded-sm border border-sand/40 bg-card p-6">
          <h2 className="text-xl">ক্যাটালগ এই মুহূর্তে লোড হচ্ছে না</h2>
          <p className="mt-2 text-sm text-inkmuted">
            একটু পরে আবার চেষ্টা করুন।
          </p>
        </div>
      )}

      {catalog !== null && catalog.length === 0 && (
        <div className="mt-10 rounded-sm border border-sand/40 bg-card p-6">
          <h2 className="text-xl">নতুন প্রিন্ট আসছে</h2>
          <p className="mt-2 text-sm text-inkmuted">
            প্রতিটা প্রিন্ট আসল স্যাম্পল পাস করার পরেই ক্যাটালগে ওঠে।
          </p>
        </div>
      )}

      {catalog !== null && catalog.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((d) => {
            const cover = d.colorways.find((c) => c.thumbnail_url)?.thumbnail_url;
            return (
              <Link
                key={d.id}
                href={`/design/${d.id}`}
                className="group overflow-hidden rounded-sm border border-sand/40 bg-card transition-colors hover:border-rosegold"
              >
                {cover ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- catalog URLs, host list not fixed yet */
                  <img
                    src={cover}
                    alt={d.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-sand/10 text-sm text-sand">
                    ছবি আসছে
                  </div>
                )}
                <div className="p-5">
                  <p className="font-en text-[10px] uppercase tracking-[0.14em] text-rosegold-deep">
                    {d.print_type === "engineered_panel"
                      ? "Engineered panel"
                      : "Allover repeat"}
                  </p>
                  <h2 className="mt-1 text-xl group-hover:text-rosegold-deep">
                    {d.name}
                  </h2>
                  <p className="mt-1 text-xs text-inkmuted">
                    কালারওয়ে: {d.colorways.length || "আসছে"} · {d.base_fabric_type}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
