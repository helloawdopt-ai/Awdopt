"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { HeroAssets } from "./scene";

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Build-prompt §8: keep the poster on reduced motion, no WebGL, low memory/cores or Save-Data. */
function canRun() {
  const nav = navigator as Nav;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if ((nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4 || nav.connection?.saveData) return false;
  const probe = document.createElement("canvas");
  return !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
}

/** Colours, fonts and the poster's own dog illustration, so the 3D faces match the poster. */
async function assets(host: HTMLElement): Promise<HeroAssets> {
  await document.fonts.ready;
  const root = getComputedStyle(document.documentElement);
  const v = (name: string) => root.getPropertyValue(name).trim();
  const svg = host.querySelector<SVGSVGElement>("[data-hero-photo] svg");
  return {
    colors: {
      ink: v("--ink"),
      surface: v("--surface"),
      bg: v("--bg"),
      bubble: v("--bubble"),
      highlight: v("--highlight"),
      fresh: v("--fresh"),
      primary: v("--primary"),
    },
    display: v("--font-unbounded") || "sans-serif",
    text: v("--font-figtree") || "sans-serif",
    caption: host.querySelector("[data-hero-caption]")?.textContent ?? "",
    // Redraw the SVG with Path2D (no <img> of an SVG), so the canvas stays untainted in Safari.
    drawPhoto(ctx, w, h) {
      if (!svg) return;
      const scale = Math.max(w / 200, h / 200); // viewBox 0 0 200 200, xMidYMax slice
      ctx.translate((w - 200 * scale) / 2, h - 200 * scale);
      ctx.scale(scale, scale);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const el of svg.querySelectorAll<SVGElement>("path, circle")) {
        const st = getComputedStyle(el);
        const path =
          el.tagName === "circle"
            ? (() => {
                const p = new Path2D();
                const [cx0, cy0, r] = ["cx", "cy", "r"].map((k) => +el.getAttribute(k)!);
                p.arc(cx0!, cy0!, r!, 0, Math.PI * 2);
                return p;
              })()
            : new Path2D(el.getAttribute("d")!);
        if (st.fill !== "none") {
          ctx.fillStyle = st.fill;
          ctx.fill(path);
        }
        if (st.stroke !== "none" && parseFloat(st.strokeWidth) > 0) {
          ctx.strokeStyle = st.stroke;
          ctx.lineWidth = parseFloat(st.strokeWidth);
          ctx.stroke(path);
        }
      }
    },
  };
}

/**
 * Landing hero panel. Shows the poster (children) first: it's static HTML, so LCP never waits on
 * WebGL. When the hero is in view and the browser is idle, the three.js scene loads (its own chunk,
 * `/` only) and cross-fades in. Decorative: the headline and CTAs live outside it.
 */
export function Hero3D({ children, className }: { children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = host.current!;
    if (!canRun()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const start = async () => {
      try {
        const [{ mountHero }, a] = await Promise.all([import("./scene"), assets(el)]);
        if (cancelled || !stage.current) return;
        dispose = mountHero(stage.current, a, {
          onReady: () => setLive(true),
          onLost: () => setLive(false),
        }).dispose;
      } catch {
        setLive(false); // keep the poster
      }
    };
    const idle = (fn: () => void) =>
      "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      idle(start);
    });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-hero={live ? "3d" : "poster"}
      className={cx("relative overflow-hidden", className)}
    >
      <div
        className={cx(
          "absolute inset-0 transition-opacity duration-500",
          live ? "opacity-0" : "motion-safe:animate-bob",
        )}
      >
        {children}
      </div>
      <div
        ref={stage}
        className={cx("absolute inset-0 transition-opacity duration-500", live ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
