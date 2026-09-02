"use client";

import { useState } from "react";
import type { Colorway, GarmentType } from "@/lib/supabase";
import StyleOptions from "@/components/StyleOptions";

/* Steps 1-3 of the order flow on the design page:
   colorway pick → garment type → one of the 5 ready style photos. */

type Props = {
  designId: string;
  colorways: Colorway[];
  garmentTypes: GarmentType[];
};

export default function DesignFlow({ designId, colorways, garmentTypes }: Props) {
  const [colorwayId, setColorwayId] = useState<string | null>(
    colorways[0]?.id ?? null
  );

  return (
    <div>
      <section className="mt-8">
        <h2 className="text-2xl">কালারওয়ে</h2>
        {colorways.length === 0 ? (
          <p className="mt-2 text-sm text-inkmuted">
            এই প্রিন্টের কালারওয়ের ছবি যোগ হচ্ছে।
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {colorways.map((c) => {
              const active = c.id === colorwayId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorwayId(c.id)}
                  aria-pressed={active}
                  className={`overflow-hidden rounded-sm border-2 text-left transition-colors ${
                    active
                      ? "border-rosegold"
                      : "border-sand/30 hover:border-rosegold/60"
                  }`}
                >
                  {c.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- catalog URLs */
                    <img
                      src={c.thumbnail_url}
                      alt={c.name}
                      className="h-20 w-24 object-cover"
                    />
                  ) : (
                    <span className="flex h-20 w-24 items-center justify-center bg-sand/10 text-xs text-sand">
                      ছবি আসছে
                    </span>
                  )}
                  <span className="block bg-card px-2 py-1.5 text-xs text-inkbody">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {garmentTypes.length === 0 ? (
        <p className="mt-8 text-sm text-inkmuted">
          এই প্রিন্টের জন্য উপযুক্ত গার্মেন্ট টাইপ ঠিক করা হচ্ছে।
        </p>
      ) : (
        <StyleOptions designId={designId} garmentTypes={garmentTypes} />
      )}
    </div>
  );
}
