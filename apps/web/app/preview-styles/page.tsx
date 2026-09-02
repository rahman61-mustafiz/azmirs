import StyleOptions from "@/components/StyleOptions";
import type { DesignStylePhoto, GarmentType } from "@/lib/supabase";

/* Dev-only preview of the Style Options section with mock data:
   3 filled slots + 2 "coming soon" placeholders. Delete before launch. */

const garmentTypes: GarmentType[] = [
  { id: "g1", slug: "three_piece", name_en: "3-piece", name_bn: "৩-পিস", sort_order: 0 },
  { id: "g2", slug: "khimar", name_en: "Khimar", name_bn: "খিমার", sort_order: 1 },
  { id: "g3", slug: "hijab", name_en: "Hijab", name_bn: "হিজাব", sort_order: 2 },
];

const mockPhotos: DesignStylePhoto[] = [
  {
    id: "p1",
    fabric_design_id: "d1",
    garment_type_id: "g1",
    photo_url: "/mock/hero-ending.jpg",
    flat_mockup_url: null,
    cutting_spec: { neck: "round", sleeve: "full" },
    style_notes: null,
    sort_order: 0,
  },
  {
    id: "p2",
    fabric_design_id: "d1",
    garment_type_id: "g1",
    photo_url: "/mock/craft-drape.jpg",
    flat_mockup_url: null,
    cutting_spec: { neck: "boat", sleeve: "three_quarter" },
    style_notes: null,
    sort_order: 1,
  },
  {
    id: "p3",
    fabric_design_id: "d1",
    garment_type_id: "g1",
    photo_url: "/mock/figure-mannequin.jpg",
    flat_mockup_url: null,
    cutting_spec: { neck: "high", sleeve: "full" },
    style_notes: null,
    sort_order: 2,
  },
];

export default function PreviewStylesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <h1 className="text-3xl">Style Options প্রিভিউ (মক ডেটা)</h1>
      <StyleOptions designId="d1" garmentTypes={garmentTypes} mockPhotos={mockPhotos} />
    </main>
  );
}
