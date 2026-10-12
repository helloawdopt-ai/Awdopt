import type { Metadata, Viewport } from "next";
import { Figtree, Unbounded } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

// Only the weights DESIGN.md §4 uses, latin subset, swap. Figtree uses 400–800, so one variable file.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: "variable", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "AWDOPT · Better Matches. Better Adoptions.", template: "%s · AWDOPT" },
  description: "Find a dog that fits your life. AWDOPT scores every dog on 8 things and tells you exactly why.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The nonce-based CSP (src/proxy.ts) needs every page rendered per request.
  await connection();
  return (
    <html lang="en" className={`${unbounded.variable} ${figtree.variable} antialiased`}>
      <head>{supabaseUrl && <link rel="preconnect" href={new URL(supabaseUrl).origin} crossOrigin="" />}</head>
      <body>{children}</body>
    </html>
  );
}
