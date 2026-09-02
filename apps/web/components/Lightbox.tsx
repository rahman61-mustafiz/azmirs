"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Full-screen zoomable lightbox.
   Zoom: mouse wheel, pinch (two pointers), double click/tap toggle.
   Pan: drag while zoomed. Close: X, backdrop click, Escape. */

const MIN_SCALE = 1;
const MAX_SCALE = 5;

type Props = { src: string; onClose: () => void };

export default function Lightbox({ src, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const applyScale = useCallback((next: number) => {
    const s = clampScale(next);
    setScale(s);
    if (s <= 1.001) {
      setTx(0);
      setTy(0);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    applyScale(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      dragStart.current = null;
    } else if (pointers.current.size === 1 && scale > 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      applyScale(pinchStart.current.scale * (dist / pinchStart.current.dist));
    } else if (pointers.current.size === 1 && dragStart.current && scale > 1) {
      setTx(dragStart.current.tx + (e.clientX - dragStart.current.x));
      setTy(dragStart.current.ty + (e.clientY - dragStart.current.y));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  };

  const onDoubleClick = () => applyScale(scale > 1.5 ? 1 : 2.4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="স্টাইলের বড় ছবি"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="বন্ধ করুন"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/10 text-ivory transition-colors hover:bg-ivory/20"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
        </svg>
      </button>

      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute h-9 w-9 animate-spin rounded-full border-2 border-ivory/25 border-t-rosegold"
        />
      )}

      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- full-res remote catalog URL */}
        <img
          src={src}
          alt="স্টাইলের বড় ছবি"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`max-h-[92vh] max-w-[94vw] select-none object-contain transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
        />
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-ivory/60">
        স্ক্রল বা দুই আঙুলে জুম করুন · বাইরে চাপলে বন্ধ
      </p>
    </div>
  );
}
