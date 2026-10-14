"use client";

import { useEffect, useRef } from "react";

type Api = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let script: Promise<void> | undefined;
// Allowed by host in the CSP (script-src challenges.cloudflare.com), loaded only where a form needs it.
const load = () =>
  (script ??= new Promise<void>((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: SRC, async: true });
    s.onload = () => resolve();
    s.onerror = () => {
      script = undefined;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.append(s);
  }));

/**
 * Cloudflare Turnstile (explicit render). Calls onToken with a fresh token, or null when it expires
 * or fails. Tokens are single use: change `resetKey` after each submit to get a new one.
 */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) return;
    let id: string | undefined;
    let live = true;
    cb.current(null);
    load()
      .then(() => {
        if (!live || !el.current || !window.turnstile) return;
        id = window.turnstile.render(el.current, {
          sitekey,
          size: "flexible",
          theme: "light",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      live = false;
      if (id) window.turnstile?.remove(id);
    };
  }, [resetKey]);

  // Reserve the widget's height so nothing shifts when it appears.
  return <div ref={el} className="min-h-[65px]" />;
}
