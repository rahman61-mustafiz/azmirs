import DesignFlow from "@/components/DesignFlow";
import type { Colorway, DesignStylePhoto, GarmentType, LaceOption } from "@/lib/supabase";

/* Dev-only preview of the FULL design-page order flow with mock data:
   colorway → garment → 3 filled + 2 placeholder styles → lace → compare →
   sizing → summary. Delete before launch. */

const garmentTypes: GarmentType[] = [
  { id: "g1", slug: "three_piece", name_en: "3-piece", name_bn: "৩-পিস", sort_order: 0 },
  { id: "g2", slug: "khimar", name_en: "Khimar", name_bn: "খিমার", sort_order: 1 },
  { id: "g3", slug: "hijab", name_en: "Hijab", name_bn: "হিজাব", sort_order: 2 },
];

const colorways: Colorway[] = [
  { id: "c1", fabric_design_id: "d1", name: "নেভি", thumbnail_url: "/mock/hero-ending.jpg", sort_order: 0 },
  { id: "c2", fabric_design_id: "d1", name: "ড্রেপ", thumbnail_url: "/mock/craft-drape.jpg", sort_order: 1 },
];

const laces: LaceOption[] = [
  { id: "l1", name: "আইভরি ক্রশে", price_per_gojo: 120, image_url: "/mock/craft-drape.jpg" },
  { id: "l2", name: "সোনালি জরি", price_per_gojo: 180, image_url: null },
];

const mockPhotos: DesignStylePhoto[] = [
  {
    id: "p1", fabric_design_id: "d1", garment_type_id: "g1",
    photo_url: "/mock/hero-ending.jpg", flat_mockup_url: null,
    cutting_spec: { neck: "round" }, style_notes: null, sort_order: 0,
  },
  {
    id: "p2", fabric_design_id: "d1", garment_type_id: "g1",
    photo_url: "/mock/craft-drape.jpg", flat_mockup_url: null,
    cutting_spec: { neck: "boat" }, style_notes: null, sort_order: 1,
  },
  {
    id: "p3", fabric_design_id: "d1", garment_type_id: "g1",
    photo_url: "/mock/figure-mannequin.jpg", flat_mockup_url: null,
    cutting_spec: { neck: "high" }, style_notes: null, sort_order: 2,
  },
];

export default function PreviewStylesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6">
      <h1 className="text-3xl">অর্ডার ফ্লো প্রিভিউ (মক ডেটা)</h1>
      <DesignFlow
        designId="d1"
        designName="নীল বাগান"
        colorways={colorways}
        garmentTypes={garmentTypes}
        laces={laces}
        mockPhotos={mockPhotos}
      />
    </main>
  );
}
