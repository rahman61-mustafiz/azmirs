"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MEASUREMENT_FIELDS,
  type Colorway,
  type DesignStylePhoto,
  type GarmentType,
  type LaceOption,
} from "@/lib/supabase";
import StyleOptions from "@/components/StyleOptions";

/* The order flow on the design page (plan section ৪.১, steps 1-6):
   colorway → garment type → one of 5 ready style photos → lace swatch →
   fabric-vs-style compare → sizing. Order submission itself is step 3
   of the build (NestJS endpoint); until then the summary links to the
   current order channel. */

const bnDigits = (n: number | string) =>
  String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

type Props = {
  designId: string;
  designName: string;
  colorways: Colorway[];
  garmentTypes: GarmentType[];
  laces: LaceOption[];
  mockPhotos?: DesignStylePhoto[];
};

type SizingPath = "reference_garment" | "measurement_form";

type OrderPrice = {
  base_price: number;
  fabric_price: number;
  lace_price: number;
  vat_amount: number;
  transportation_price: number;
  total_price: number;
  advance_amount: number;
  remaining_cod_amount: number;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; orderNumber: string; price: OrderPrice };

export default function DesignFlow({
  designId,
  designName,
  colorways,
  garmentTypes,
  laces,
  mockPhotos,
}: Props) {
  const [colorwayId, setColorwayId] = useState<string | null>(colorways[0]?.id ?? null);
  const [garment, setGarment] = useState<GarmentType | null>(garmentTypes[0] ?? null);
  const [style, setStyle] = useState<DesignStylePhoto | null>(null);
  const [laceId, setLaceId] = useState<string | "none">("none");
  const [sizing, setSizing] = useState<SizingPath>("reference_garment");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMsg, setOtpMsg] = useState("");

  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/otp/config`)
      .then((r) => r.json())
      .then((c) => setOtpRequired(!!c?.required))
      .catch(() => setOtpRequired(false));
  }, [apiUrl]);

  async function otpCall(path: string, body: Record<string, string>) {
    const res = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(String(data?.message ?? "হয়নি, আবার চেষ্টা করুন"));
  }

  const colorway = colorways.find((c) => c.id === colorwayId) ?? null;
  const lace = laceId === "none" ? null : laces.find((l) => l.id === laceId) ?? null;

  const measurementsComplete = useMemo(
    () =>
      MEASUREMENT_FIELDS.every((f) => {
        const v = Number(measurements[f.key]);
        return Number.isFinite(v) && v >= f.min && v <= f.max;
      }),
    [measurements]
  );
  const sizingComplete =
    sizing === "reference_garment" ? true : measurementsComplete;
  const ready = !!colorway && !!garment && !!style && sizingComplete;

  const setM = (key: string, raw: string) => {
    const v = raw.replace(/[^0-9.]/g, "");
    setMeasurements((m) => ({ ...m, [key]: v }));
  };

  async function submitOrder() {
    if (!apiUrl || !ready || !garment || !style) return;
    if (otpRequired && !otpVerified) {
      setSubmitState({ kind: "error", message: "আগে ফোন নম্বরটা OTP দিয়ে যাচাই করুন" });
      return;
    }
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: custName.trim(), phone: custPhone.trim() },
          fabric_design_id: designId,
          colorway_id: colorwayId,
          garment_type_id: garment.id,
          style_photo_id: style.id,
          lace_option_id: laceId === "none" ? null : laceId,
          sizing_method: sizing,
          measurements:
            sizing === "measurement_form"
              ? Object.fromEntries(
                  MEASUREMENT_FIELDS.map((f) => [f.key, Number(measurements[f.key])])
                )
              : undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(body?.message)
          ? body.message.join(", ")
          : (body?.message ?? "অর্ডার জমা দেওয়া যায়নি, একটু পরে চেষ্টা করুন");
        setSubmitState({ kind: "error", message: String(msg) });
        return;
      }
      setSubmitState({
        kind: "success",
        orderNumber: body.order_number,
        price: body.price as OrderPrice,
      });
    } catch {
      setSubmitState({
        kind: "error",
        message: "সার্ভারে পৌঁছানো যায়নি, ইন্টারনেট দেখে আবার চেষ্টা করুন",
      });
    }
  }

  return (
    <div>
      {/* ১. কালারওয়ে */}
      <section className="mt-8">
        <h2 className="text-2xl">কালারওয়ে</h2>
        {colorways.length === 0 ? (
          <p className="mt-2 text-sm text-inkmuted">এই প্রিন্টের কালারওয়ের ছবি যোগ হচ্ছে।</p>
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
                    active ? "border-rosegold" : "border-sand/30 hover:border-rosegold/60"
                  }`}
                >
                  {c.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- catalog URLs */
                    <img src={c.thumbnail_url} alt={c.name} className="h-20 w-24 object-cover" />
                  ) : (
                    <span className="flex h-20 w-24 items-center justify-center bg-sand/10 text-xs text-sand">
                      ছবি আসছে
                    </span>
                  )}
                  <span className="block bg-card px-2 py-1.5 text-xs text-inkbody">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ২-৩. গার্মেন্ট + ৫টা রেডি স্টাইল */}
      {garmentTypes.length === 0 ? (
        <p className="mt-8 text-sm text-inkmuted">
          এই প্রিন্টের জন্য উপযুক্ত গার্মেন্ট টাইপ ঠিক করা হচ্ছে।
        </p>
      ) : (
        <StyleOptions
          designId={designId}
          garmentTypes={garmentTypes}
          mockPhotos={mockPhotos}
          onGarmentChange={(g) => {
            setGarment(g);
            setStyle(null);
          }}
          onStyleSelect={setStyle}
        />
      )}

      {/* ৪. লেইস swatch */}
      <section className="mt-10">
        <h2 className="text-2xl">লেইস</h2>
        <p className="mt-1 max-w-xl text-sm text-inkmuted">
          লেইস swatch হিসেবে দেখানো হয়, স্টাইলের ছবিতে বসানো হয় না। দামটা মোট দামে যোগ হয়।
        </p>
        {laces.length === 0 ? (
          <p className="mt-3 rounded-sm border border-sand/30 bg-card p-4 text-sm text-inkmuted">
            লেইস অপশন যোগ হচ্ছে। আপাতত লেইস ছাড়াই অর্ডার এগোবে, চাইলে অর্ডারের নোটে লিখে দিতে
            পারেন।
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setLaceId("none")}
              aria-pressed={laceId === "none"}
              className={`flex h-20 w-28 items-center justify-center rounded-sm border-2 bg-card text-sm transition-colors ${
                laceId === "none"
                  ? "border-rosegold text-rosegold-deep"
                  : "border-sand/30 text-inkmuted hover:border-rosegold/60"
              }`}
            >
              লেইস ছাড়া
            </button>
            {laces.map((l) => {
              const active = l.id === laceId;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLaceId(l.id)}
                  aria-pressed={active}
                  className={`overflow-hidden rounded-sm border-2 text-left transition-colors ${
                    active ? "border-rosegold" : "border-sand/30 hover:border-rosegold/60"
                  }`}
                >
                  {l.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- catalog URLs */
                    <img src={l.image_url} alt={l.name} className="h-20 w-28 object-cover" />
                  ) : (
                    <span className="flex h-20 w-28 items-center justify-center bg-sand/10 text-xs text-sand">
                      ছবি আসছে
                    </span>
                  )}
                  <span className="block bg-card px-2 py-1.5 text-xs text-inkbody">
                    {l.name} · ৳{bnDigits(l.price_per_gojo)}/গজ
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ৫. কাপড় vs স্টাইল compare */}
      {style && colorway && (
        <section className="mt-10">
          <h2 className="text-2xl">যা অর্ডার করছেন, পাশাপাশি</h2>
          <p className="mt-1 max-w-xl text-sm text-inkmuted">
            বাঁয়ে আসল কাপড়ের প্রিন্ট, ডানে আপনার বাছাই করা স্টাইল। জামাটা এই কাপড়েই সেলাই হবে।
          </p>
          <div className="mt-4 grid max-w-2xl grid-cols-2 gap-3">
            <figure className="overflow-hidden rounded-sm border border-sand/30 bg-card">
              {colorway.thumbnail_url ? (
                /* eslint-disable-next-line @next/next/no-img-element -- catalog URLs */
                <img
                  src={colorway.thumbnail_url}
                  alt={`${designName} ${colorway.name} কাপড়`}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <span className="flex aspect-[3/4] items-center justify-center bg-sand/10 text-xs text-sand">
                  ছবি আসছে
                </span>
              )}
              <figcaption className="px-3 py-2 text-xs text-inkmuted">
                কাপড়: {designName}, {colorway.name}
              </figcaption>
            </figure>
            <figure className="overflow-hidden rounded-sm border border-sand/30 bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- catalog URLs */}
              <img
                src={style.photo_url}
                alt="বাছাই করা স্টাইল"
                className="aspect-[3/4] w-full object-cover"
              />
              <figcaption className="px-3 py-2 text-xs text-inkmuted">বাছাই করা স্টাইল</figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* ৬. মাপ */}
      <section className="mt-10">
        <h2 className="text-2xl">মাপ</h2>
        <p className="mt-1 max-w-xl text-sm text-inkmuted">
          কোনো S/M/L/XL নেই। দুটো পথের যেকোনো একটা সম্পূর্ণ করলে তবেই অর্ডার এগোয়।
        </p>
        <div className="mt-4 grid max-w-2xl gap-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors ${
              sizing === "reference_garment" ? "border-rosegold bg-card" : "border-sand/30 bg-card"
            }`}
          >
            <input
              type="radio"
              name="sizing"
              checked={sizing === "reference_garment"}
              onChange={() => setSizing("reference_garment")}
              className="mt-1.5 h-4 w-4 accent-rosegold"
            />
            <span>
              <span className="block font-medium text-navy-deep">রেফারেন্স জামা কুরিয়ার করব</span>
              <span className="mt-1 block text-sm text-inkmuted">
                ভালো ফিট হওয়া একটা জামা পাঠাবেন, মাপ ওটা থেকেই নেওয়া হবে। কুরিয়ারের ঠিকানা অর্ডার
                কনফার্মেশনের সাথে পাবেন, জামা ফেরত যায় অর্ডারের বক্সে।
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors ${
              sizing === "measurement_form" ? "border-rosegold bg-card" : "border-sand/30 bg-card"
            }`}
          >
            <input
              type="radio"
              name="sizing"
              checked={sizing === "measurement_form"}
              onChange={() => setSizing("measurement_form")}
              className="mt-1.5 h-4 w-4 accent-rosegold"
            />
            <span>
              <span className="block font-medium text-navy-deep">মাপগুলো এখনই দিচ্ছি</span>
              <span className="mt-1 block text-sm text-inkmuted">১০টা মাপ, সবগুলো ইঞ্চিতে।</span>
            </span>
          </label>
        </div>

        {sizing === "measurement_form" && (
          <div className="mt-4 grid max-w-2xl grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {MEASUREMENT_FIELDS.map((f) => (
              <label key={f.key} className="grid gap-1.5 text-sm text-inkbody">
                {f.bn}
                <span className="flex overflow-hidden rounded-sm border border-sand/40 bg-card focus-within:outline focus-within:outline-2 focus-within:outline-rosegold">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={f.min}
                    max={f.max}
                    step={0.5}
                    value={measurements[f.key] ?? ""}
                    onChange={(e) => setM(f.key, e.target.value)}
                    className="w-full border-0 bg-transparent px-3 py-2.5 text-base text-navy-deep outline-none"
                  />
                  <span className="flex items-center border-l border-sand/25 bg-foil/5 px-3 text-xs text-rosegold-deep">
                    ইঞ্চি
                  </span>
                </span>
              </label>
            ))}
            {!measurementsComplete && (
              <p className="text-xs text-inkmuted sm:col-span-2">
                ১০টা ঘরই পূরণ করলে অর্ডার এগোবে। কীভাবে মাপবেন,{" "}
                <a
                  href="https://azmirs.com/guide.html"
                  className="text-rosegold-deep underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  মাপ গাইডে
                </a>{" "}
                ছবিসহ দেখানো আছে।
              </p>
            )}
          </div>
        )}
      </section>

      {/* সামারি */}
      <section className="mt-10 max-w-2xl rounded-sm border border-sand/40 bg-card p-5">
        <h2 className="text-xl">আপনার বাছাই</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <Row label="প্রিন্ট" value={`${designName}${colorway ? `, ${colorway.name}` : ""}`} done={!!colorway} />
          <Row label="গার্মেন্ট" value={garment?.name_bn ?? "বাছাই হয়নি"} done={!!garment} />
          <Row
            label="স্টাইল"
            value={style ? "বাছাই হয়েছে" : "৫টা রেডি স্টাইল থেকে একটা বাছুন"}
            done={!!style}
          />
          <Row
            label="লেইস"
            value={lace ? `${lace.name} (৳${bnDigits(lace.price_per_gojo)}/গজ)` : "লেইস ছাড়া"}
            done
          />
          <Row
            label="মাপ"
            value={
              sizing === "reference_garment"
                ? "রেফারেন্স জামা কুরিয়ার"
                : measurementsComplete
                  ? "১০টা মাপ দেওয়া হয়েছে"
                  : "মাপ ফর্ম অসম্পূর্ণ"
            }
            done={sizingComplete}
          />
        </dl>
        <p className="mt-4 text-xs text-inkmuted">
          দাম দেখানো হবে অর্ডার জমার ধাপে: বেস সেলাই + কাপড় + লেইস + ভ্যাট + ডেলিভারি, সবটা
          আইটেম ধরে ধরে। ৩০% অ্যাডভান্সে অর্ডার লক হয়, বাকিটা ডেলিভারিতে।
        </p>
        {submitState.kind === "success" ? (
          <div className="mt-4 rounded-sm border border-rosegold/50 bg-foil/5 p-4">
            <p className="font-medium text-navy-deep">
              অর্ডার জমা হয়েছে · নম্বর {submitState.orderNumber}
            </p>
            <dl className="mt-2 grid gap-1 text-sm text-inkbody">
              <PriceRow label="বেস সেলাই" v={submitState.price.base_price} />
              {submitState.price.lace_price > 0 && (
                <PriceRow label="লেইস" v={submitState.price.lace_price} />
              )}
              {submitState.price.vat_amount > 0 && (
                <PriceRow label="ভ্যাট" v={submitState.price.vat_amount} />
              )}
              {submitState.price.transportation_price > 0 && (
                <PriceRow label="ডেলিভারি" v={submitState.price.transportation_price} />
              )}
              <PriceRow label="মোট" v={submitState.price.total_price} strong />
              <PriceRow label="অ্যাডভান্স (৩০%)" v={submitState.price.advance_amount} strong />
            </dl>
            <p className="mt-3 text-xs text-inkmuted">
              অ্যাডভান্সটা এখন হয় ম্যানুয়ালি: আমরা ফোন করে bKash নম্বর জানাবো, অ্যাডভান্স
              পৌঁছালেই অর্ডার কনফার্ম। অনলাইন পেমেন্ট যোগ হচ্ছে।
            </p>
          </div>
        ) : (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submitOrder();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-inkbody">
                আপনার নাম
                <input
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="rounded-sm border border-sand/40 bg-card px-3 py-2.5 text-base text-navy-deep outline-none focus:outline-2 focus:outline-rosegold"
                />
              </label>
              <label className="grid gap-1.5 text-sm text-inkbody">
                ফোন নম্বর
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                  placeholder="01XXXXXXXXX"
                  className="rounded-sm border border-sand/40 bg-card px-3 py-2.5 text-base text-navy-deep outline-none focus:outline-2 focus:outline-rosegold"
                />
              </label>
            </div>
            {otpRequired && (
              <div className="rounded-sm border border-sand/30 bg-foil/5 p-3">
                {otpVerified ? (
                  <p className="text-sm text-navy-deep">ফোন নম্বর যাচাই হয়েছে ✓</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void otpCall("/otp/send", { phone: custPhone })
                          .then(() => {
                            setOtpSent(true);
                            setOtpMsg("কোড পাঠানো হয়েছে, SMS দেখুন");
                          })
                          .catch((e) => setOtpMsg(e.message))
                      }
                      className="rounded-sm border border-navy px-4 py-2 text-sm text-navy"
                    >
                      {otpSent ? "আবার কোড পাঠান" : "ফোনে কোড পাঠান"}
                    </button>
                    {otpSent && (
                      <>
                        <input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="৬ সংখ্যার কোড"
                          className="w-32 rounded-sm border border-sand/40 bg-card px-3 py-2 text-base"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void otpCall("/otp/verify", { phone: custPhone, code: otpCode })
                              .then(() => {
                                setOtpVerified(true);
                                setOtpMsg("");
                              })
                              .catch((e) => setOtpMsg(e.message))
                          }
                          className="rounded-sm bg-navy px-4 py-2 text-sm text-ivory"
                        >
                          যাচাই করুন
                        </button>
                      </>
                    )}
                    {otpMsg && <p className="w-full text-xs text-rosegold-deep">{otpMsg}</p>}
                  </div>
                )}
              </div>
            )}
            {submitState.kind === "error" && (
              <p className="text-sm text-rosegold-deep">{submitState.message}</p>
            )}
            <button
              type="submit"
              disabled={!ready || submitState.kind === "submitting" || !apiUrl}
              className="inline-flex w-fit rounded-sm bg-rosegold px-7 py-3 font-medium text-card transition-colors enabled:hover:bg-rosegold-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitState.kind === "submitting" ? "জমা হচ্ছে…" : "অর্ডার জমা দিন"}
            </button>
            {!apiUrl && (
              <p className="text-xs text-inkmuted">
                অর্ডার জমা নেওয়ার সার্ভারটা এখনো চালু হয়নি। ততদিন অর্ডার হয়{" "}
                <a
                  href="https://azmirs.com/contact.html"
                  className="text-rosegold-deep underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  যোগাযোগ পেজ
                </a>{" "}
                থেকে।
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}

function PriceRow({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-medium text-navy-deep" : ""}`}>
      <span>{label}</span>
      <span>৳{bnDigits(v)}</span>
    </div>
  );
}

function Row({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-sand/20 pb-2">
      <dt className="text-inkmuted">{label}</dt>
      <dd className={`text-right ${done ? "text-navy-deep" : "text-rosegold-deep"}`}>{value}</dd>
    </div>
  );
}
