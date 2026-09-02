"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, type DesignStylePhoto, type GarmentType } from "@/lib/supabase";
import Lightbox from "@/components/Lightbox";

const SLOT_COUNT = 5;

const bnDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

type Props = {
  designId: string;
  garmentTypes: GarmentType[];
  /* dev preview only: bypasses the Supabase fetch */
  mockPhotos?: DesignStylePhoto[];
  onStyleSelect?: (photo: DesignStylePhoto | null) => void;
  onGarmentChange?: (garment: GarmentType) => void;
};

export default function StyleOptions({
  designId,
  garmentTypes,
  mockPhotos,
  onStyleSelect,
  onGarmentChange,
}: Props) {
  const [garmentId, setGarmentId] = useState<string | null>(garmentTypes[0]?.id ?? null);
  const [photos, setPhotos] = useState<DesignStylePhoto[]>(mockPhotos ?? []);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (mockPhotos) return;
    if (!supabase || !garmentId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("design_style_photos")
      .select(
        "id,fabric_design_id,garment_type_id,photo_url,flat_mockup_url,cutting_spec,style_notes,sort_order"
      )
      .eq("fabric_design_id", designId)
      .eq("garment_type_id", garmentId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(SLOT_COUNT);
    setPhotos(error ? [] : ((data as DesignStylePhoto[]) ?? []));
    setLoading(false);
  }, [designId, garmentId, mockPhotos]);

  useEffect(() => {
    setSelectedId(null);
    void load();
  }, [load]);

  const slots: (DesignStylePhoto | null)[] = Array.from(
    { length: SLOT_COUNT },
    (_, i) => photos[i] ?? null
  );

  return (
    <section className="mt-10">
      <h2 className="text-2xl">স্টাইল অপশন</h2>
      <p className="mt-1 max-w-xl text-sm text-inkmuted">
        এই প্রিন্টে বানানো স্টাইলগুলো। একটা বেছে নিন, সেটার কাটিং ধরেই আপনার জামা হবে। বড় করে
        দেখতে থাম্বনেইলের কোণার আতশ কাচে চাপ দিন।
      </p>

      {garmentTypes.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="গার্মেন্ট টাইপ">
          {garmentTypes.map((g) => {
            const active = g.id === garmentId;
            return (
              <button
                key={g.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setGarmentId(g.id);
                  onGarmentChange?.(g);
                  onStyleSelect?.(null);
                }}
                className={`rounded-sm border px-4 py-2 text-sm transition-colors ${
                  active
                    ? "border-navy bg-navy text-ivory"
                    : "border-sand/50 bg-card text-inkbody hover:border-rosegold"
                }`}
              >
                {g.name_bn}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((photo, i) =>
          photo ? (
            <FilledSlot
              key={photo.id}
              photo={photo}
              index={i}
              selected={photo.id === selectedId}
              onSelect={() => {
                setSelectedId(photo.id);
                onStyleSelect?.(photo);
              }}
              onZoom={() => setZoomUrl(photo.photo_url)}
            />
          ) : (
            <EmptySlot key={`empty-${i}`} loading={loading} />
          )
        )}
      </div>

      {selectedId && (
        <p className="mt-4 text-sm text-rosegold-deep">
          স্টাইল {bnDigits(photos.findIndex((p) => p.id === selectedId) + 1)} বাছাই হয়েছে। পরের
          ধাপে এই কাটিং ধরেই এগোবে।
        </p>
      )}

      {zoomUrl && <Lightbox src={zoomUrl} onClose={() => setZoomUrl(null)} />}
    </section>
  );
}

function FilledSlot({
  photo,
  index,
  selected,
  onSelect,
  onZoom,
}: {
  photo: DesignStylePhoto;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onZoom: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-sm border-2 bg-card transition-colors ${
        selected ? "border-rosegold" : "border-sand/30 hover:border-rosegold/60"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`স্টাইল ${bnDigits(index + 1)} বাছাই করুন`}
        className="block w-full cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs, host list not fixed yet */}
        <img
          src={photo.photo_url}
          alt={`স্টাইল ${bnDigits(index + 1)}`}
          loading="lazy"
          className="aspect-[3/4] w-full object-cover"
        />
      </button>

      {selected && (
        <span
          aria-hidden="true"
          className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rosegold text-card"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoom();
        }}
        aria-label={`স্টাইল ${bnDigits(index + 1)} বড় করে দেখুন`}
        className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink/60 text-ivory opacity-90 backdrop-blur-sm transition-opacity hover:bg-ink/80 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" strokeLinecap="round" />
          <path d="M8.5 6.2v4.6M6.2 8.5h4.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="px-2.5 py-2">
        <p className="text-xs text-inkmuted">স্টাইল {bnDigits(index + 1)}</p>
      </div>
    </div>
  );
}

function EmptySlot({ loading }: { loading: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-sand/30 bg-sand/10 opacity-60"
    >
      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2">
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-sand/40 border-t-rosegold" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-sand" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
              <path d="m3.5 15.5 4.5-4 4 3.5 3.5-3 5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <p className="text-xs text-sand">স্টাইল আসছে</p>
          </>
        )}
      </div>
    </div>
  );
}
