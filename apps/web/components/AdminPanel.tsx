"use client";

import { useCallback, useEffect, useState } from "react";

/* Admin panel: catalog uploads (designs, colorways, the 5 style photos per
   design × garment — images arrive READY from the external Gemini + FASHN
   pipeline), lace options, and order status management. Every write goes
   through the NestJS API with the shared admin token; the browser never
   touches the service_role key. */

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const STATUS_LABELS: Record<string, string> = {
  pending_advance: "অ্যাডভান্স বাকি",
  confirmed: "কনফার্মড",
  measurement_received: "মাপ পৌঁছেছে",
  cutting: "কাটিং",
  stitching: "সেলাই",
  embellishment: "লেইসের কাজ",
  qc: "QC",
  ready_to_ship: "পাঠানোর জন্য রেডি",
  shipped: "শিপড",
  delivered: "ডেলিভার্ড",
  cancelled: "বাতিল",
};

type Overview = {
  designs: { id: string; name: string; print_type: string; status: string }[];
  colorways: {
    id: string;
    fabric_design_id: string;
    name: string;
    thumbnail_url: string | null;
    is_active: boolean;
  }[];
  styles: {
    id: string;
    fabric_design_id: string;
    garment_type_id: string;
    photo_url: string;
    is_active: boolean;
  }[];
  laces: {
    id: string;
    name: string;
    price_per_gojo: number;
    image_url: string | null;
    is_active: boolean;
  }[];
  garments: { id: string; slug: string; name_bn: string }[];
  compatibility: { fabric_design_id: string; garment_type_id: string }[];
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  sizing_method: string;
  created_at: string;
  customers: { name: string; phone: string } | null;
  fabric_designs: { name: string } | null;
  garment_types: { name_bn: string } | null;
};

export default function AdminPanel() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"catalog" | "laces" | "orders">("catalog");
  const [ov, setOv] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState("");

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body && !(init.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init?.headers ?? {}),
        },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const m = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
        throw new Error(String(m ?? `HTTP ${res.status}`));
      }
      return body;
    },
    [token]
  );

  const refresh = useCallback(async () => {
    const [o, ord] = await Promise.all([call("/admin/overview"), call("/admin/orders")]);
    setOv(o);
    setOrders(ord);
  }, [call]);

  useEffect(() => {
    const saved = sessionStorage.getItem("azm-admin-token");
    if (saved) setToken(saved);
  }, []);

  async function login() {
    try {
      setMsg("");
      await call("/admin/overview");
      sessionStorage.setItem("azm-admin-token", token);
      setAuthed(true);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ঢোকা যায়নি");
    }
  }

  const act = async (fn: () => Promise<unknown>) => {
    try {
      setMsg("");
      await fn();
      await refresh();
      setMsg("হয়ে গেছে ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "কাজটা হয়নি");
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-24">
        <h1 className="text-3xl">অ্যাডমিন</h1>
        <p className="mt-2 text-sm text-inkmuted">অ্যাডমিন টোকেনটা দিন (API-র ADMIN_TOKEN)।</p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void login()}
          className="mt-4 w-full rounded-sm border border-sand/40 bg-card px-3 py-2.5 outline-none focus:outline-2 focus:outline-rosegold"
        />
        <button
          onClick={() => void login()}
          className="mt-3 rounded-sm bg-navy px-6 py-2.5 text-ivory hover:bg-navy-deep"
        >
          ঢুকুন
        </button>
        {msg && <p className="mt-3 text-sm text-rosegold-deep">{msg}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Azmirs অ্যাডমিন</h1>
        <div className="flex gap-2">
          {(["catalog", "laces", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-sm border px-4 py-2 text-sm ${
                tab === t ? "border-navy bg-navy text-ivory" : "border-sand/50 bg-card"
              }`}
            >
              {t === "catalog" ? "ক্যাটালগ" : t === "laces" ? "লেইস" : `অর্ডার (${orders.length})`}
            </button>
          ))}
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-rosegold-deep">{msg}</p>}

      {tab === "catalog" && ov && <CatalogTab ov={ov} call={call} act={act} />}
      {tab === "laces" && ov && <LacesTab ov={ov} call={call} act={act} />}
      {tab === "orders" && <OrdersTab orders={orders} call={call} act={act} />}
    </main>
  );
}

type CallFn = (path: string, init?: RequestInit) => Promise<any>;
type ActFn = (fn: () => Promise<unknown>) => Promise<void>;

function CatalogTab({ ov, call, act }: { ov: Overview; call: CallFn; act: ActFn }) {
  const [name, setName] = useState("");
  const [printType, setPrintType] = useState("allover_repeat");
  const [garmentIds, setGarmentIds] = useState<string[]>([]);

  return (
    <div className="mt-6 grid gap-8">
      <section className="rounded-sm border border-sand/40 bg-card p-5">
        <h2 className="text-xl">নতুন প্রিন্ট</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            নাম
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-sm border border-sand/40 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            ধরন
            <select
              value={printType}
              onChange={(e) => setPrintType(e.target.value)}
              className="rounded-sm border border-sand/40 px-3 py-2"
            >
              <option value="allover_repeat">Allover repeat</option>
              <option value="engineered_panel">Engineered panel</option>
            </select>
          </label>
          <fieldset className="flex gap-3 text-sm">
            {ov.garments.map((g) => (
              <label key={g.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={garmentIds.includes(g.id)}
                  onChange={(e) =>
                    setGarmentIds((ids) =>
                      e.target.checked ? [...ids, g.id] : ids.filter((x) => x !== g.id)
                    )
                  }
                />
                {g.name_bn}
              </label>
            ))}
          </fieldset>
          <button
            onClick={() =>
              void act(() =>
                call("/admin/designs", {
                  method: "POST",
                  body: JSON.stringify({
                    name,
                    print_type: printType,
                    garment_type_ids: garmentIds,
                  }),
                })
              )
            }
            className="rounded-sm bg-navy px-5 py-2 text-ivory"
          >
            যোগ করুন
          </button>
        </div>
      </section>

      {ov.designs.map((d) => (
        <DesignCard key={d.id} d={d} ov={ov} call={call} act={act} />
      ))}
    </div>
  );
}

function DesignCard({
  d,
  ov,
  call,
  act,
}: {
  d: Overview["designs"][number];
  ov: Overview;
  call: CallFn;
  act: ActFn;
}) {
  const myColorways = ov.colorways.filter((c) => c.fabric_design_id === d.id);
  const myGarments = ov.garments.filter((g) =>
    ov.compatibility.some(
      (x) => x.fabric_design_id === d.id && x.garment_type_id === g.id
    )
  );
  const [cwName, setCwName] = useState("");
  const [cwFile, setCwFile] = useState<File | null>(null);

  return (
    <section className="rounded-sm border border-sand/40 bg-card p-5">
      <h2 className="text-xl">
        {d.name}{" "}
        <span className="font-en text-xs uppercase tracking-widest text-rosegold-deep">
          {d.print_type}
        </span>
      </h2>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-inkmuted">কালারওয়ে</h3>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          {myColorways.map((c) => (
            <figure key={c.id} className={`w-24 ${c.is_active ? "" : "opacity-40"}`}>
              {c.thumbnail_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={c.thumbnail_url} alt={c.name} className="h-16 w-24 rounded-sm object-cover" />
              ) : (
                <span className="flex h-16 w-24 items-center justify-center rounded-sm bg-sand/10 text-xs">
                  ছবি নেই
                </span>
              )}
              <figcaption className="mt-1 flex items-center justify-between text-xs">
                {c.name}
                <button
                  onClick={() =>
                    void act(() =>
                      call(`/admin/colorways/${c.id}/active`, {
                        method: "PATCH",
                        body: JSON.stringify({ is_active: !c.is_active }),
                      })
                    )
                  }
                  className="text-rosegold-deep underline"
                >
                  {c.is_active ? "বন্ধ" : "চালু"}
                </button>
              </figcaption>
            </figure>
          ))}
          <div className="flex items-end gap-2">
            <input
              placeholder="নতুন কালারওয়ের নাম"
              value={cwName}
              onChange={(e) => setCwName(e.target.value)}
              className="rounded-sm border border-sand/40 px-2 py-1.5 text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCwFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <button
              onClick={() =>
                void act(() => {
                  const fd = new FormData();
                  fd.set("fabric_design_id", d.id);
                  fd.set("name", cwName);
                  if (cwFile) fd.set("image", cwFile);
                  return call("/admin/colorways", { method: "POST", body: fd });
                })
              }
              className="rounded-sm border border-navy px-3 py-1.5 text-sm text-navy"
            >
              + কালারওয়ে
            </button>
          </div>
        </div>
      </div>

      {myGarments.map((g) => (
        <StyleRow key={g.id} d={d} g={g} ov={ov} call={call} act={act} />
      ))}
    </section>
  );
}

function StyleRow({
  d,
  g,
  ov,
  call,
  act,
}: {
  d: Overview["designs"][number];
  g: Overview["garments"][number];
  ov: Overview;
  call: CallFn;
  act: ActFn;
}) {
  const styles = ov.styles.filter(
    (s) => s.fabric_design_id === d.id && s.garment_type_id === g.id
  );
  const activeCount = styles.filter((s) => s.is_active).length;
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mt-4 border-t border-sand/20 pt-3">
      <h3 className="text-sm font-medium text-inkmuted">
        {g.name_bn} — স্টাইল ফটো ({activeCount}/৫ active)
      </h3>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {styles.map((s) => (
          <figure key={s.id} className={`w-20 ${s.is_active ? "" : "opacity-40"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.photo_url} alt="" className="h-24 w-20 rounded-sm object-cover" />
            <button
              onClick={() =>
                void act(() =>
                  call(`/admin/style-photos/${s.id}/active`, {
                    method: "PATCH",
                    body: JSON.stringify({ is_active: !s.is_active }),
                  })
                )
              }
              className="mt-1 text-xs text-rosegold-deep underline"
            >
              {s.is_active ? "বন্ধ" : "চালু"}
            </button>
          </figure>
        ))}
        <div className="flex items-end gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <button
            onClick={() =>
              void act(() => {
                const fd = new FormData();
                fd.set("fabric_design_id", d.id);
                fd.set("garment_type_id", g.id);
                if (file) fd.set("image", file);
                return call("/admin/style-photos", { method: "POST", body: fd });
              })
            }
            className="rounded-sm border border-navy px-3 py-1.5 text-sm text-navy"
          >
            + স্টাইল ফটো
          </button>
        </div>
      </div>
    </div>
  );
}

function LacesTab({ ov, call, act }: { ov: Overview; call: CallFn; act: ActFn }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-sm border border-sand/40 bg-card p-5">
        <h2 className="text-xl">নতুন লেইস</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            নাম
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-sm border border-sand/40 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            প্রতি গজ দাম (৳)
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32 rounded-sm border border-sand/40 px-3 py-2"
            />
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <button
            onClick={() =>
              void act(() => {
                const fd = new FormData();
                fd.set("name", name);
                fd.set("price_per_gojo", price);
                if (file) fd.set("image", file);
                return call("/admin/laces", { method: "POST", body: fd });
              })
            }
            className="rounded-sm bg-navy px-5 py-2 text-ivory"
          >
            যোগ করুন
          </button>
        </div>
      </section>
      <div className="flex flex-wrap gap-4">
        {ov.laces.map((l) => (
          <figure
            key={l.id}
            className={`w-32 rounded-sm border border-sand/30 bg-card p-2 ${l.is_active ? "" : "opacity-40"}`}
          >
            {l.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={l.image_url} alt={l.name} className="h-20 w-full rounded-sm object-cover" />
            ) : (
              <span className="flex h-20 items-center justify-center bg-sand/10 text-xs">ছবি নেই</span>
            )}
            <figcaption className="mt-1.5 text-xs">
              {l.name} · ৳{l.price_per_gojo}/গজ
              <button
                onClick={() =>
                  void act(() =>
                    call(`/admin/laces/${l.id}/active`, {
                      method: "PATCH",
                      body: JSON.stringify({ is_active: !l.is_active }),
                    })
                  )
                }
                className="ml-2 text-rosegold-deep underline"
              >
                {l.is_active ? "বন্ধ" : "চালু"}
              </button>
            </figcaption>
          </figure>
        ))}
        {ov.laces.length === 0 && (
          <p className="text-sm text-inkmuted">এখনো কোনো লেইস যোগ হয়নি।</p>
        )}
      </div>
    </div>
  );
}

function OrdersTab({
  orders,
  call,
  act,
}: {
  orders: OrderRow[];
  call: CallFn;
  act: ActFn;
}) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-sand/40 text-left text-xs uppercase tracking-wide text-inkmuted">
            <th className="py-2 pr-3">অর্ডার</th>
            <th className="py-2 pr-3">কাস্টমার</th>
            <th className="py-2 pr-3">কী</th>
            <th className="py-2 pr-3">মোট</th>
            <th className="py-2 pr-3">মাপ</th>
            <th className="py-2 pr-3">স্ট্যাটাস</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-sand/20 align-top">
              <td className="py-2.5 pr-3 font-medium text-navy-deep">
                {o.order_number}
                <div className="text-xs font-normal text-inkmuted">
                  {new Date(o.created_at).toLocaleDateString("bn-BD")}
                </div>
              </td>
              <td className="py-2.5 pr-3">
                {o.customers?.name}
                <div className="text-xs text-inkmuted">{o.customers?.phone}</div>
              </td>
              <td className="py-2.5 pr-3">
                {o.fabric_designs?.name} · {o.garment_types?.name_bn}
              </td>
              <td className="py-2.5 pr-3">৳{o.total_price}</td>
              <td className="py-2.5 pr-3 text-xs">
                {o.sizing_method === "reference_garment" ? "রেফারেন্স জামা" : "মাপ ফর্ম"}
              </td>
              <td className="py-2.5 pr-3">
                <select
                  value={o.status}
                  onChange={(e) =>
                    void act(() =>
                      call(`/admin/orders/${o.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: e.target.value }),
                      })
                    )
                  }
                  className="rounded-sm border border-sand/40 bg-card px-2 py-1.5"
                >
                  {Object.entries(STATUS_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-inkmuted">
                এখনো কোনো অর্ডার আসেনি।
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
