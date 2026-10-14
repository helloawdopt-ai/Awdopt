// Uploads generated, clearly fake photos for the dev seed (supabase/seed/dev.sql). awdopt-dev ONLY.
// Approved dogs' files go to the public dog-photos bucket, pending ones to private listing-uploads.
// Usage: node --env-file=.env.local scripts/seed-dev-photos.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
if (new URL(url).host !== "bdrkuwznuuklrryxddba.supabase.co") throw new Error("Only for awdopt-dev");
const headers = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };

const css = await readFile(new URL("../src/app/tokens.css", import.meta.url), "utf8");
const token = (name) => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
const [ink, ...tints] = ["ink", "highlight", "bubble", "fresh", "peach"].map(token);

const res = await fetch(
  `${url}/rest/v1/dog_photos?select=position,path_480,path_960,path_1600,dogs(name,status)&path_480=like.fake/*`,
  { headers },
);
if (!res.ok) throw new Error(`read failed: ${res.status}`);
const rows = await res.json();

for (const [i, row] of rows.entries()) {
  const label = `${row.dogs.name.replace(/[<&>]/g, "")} · sample photo ${row.position + 1}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
    <rect width="1600" height="1200" fill="${tints[i % tints.length]}"/>
    <circle cx="800" cy="560" r="300" fill="none" stroke="${ink}" stroke-width="24" stroke-dasharray="40 30"/>
    <text x="800" y="1040" font-family="sans-serif" font-size="64" font-weight="700" text-anchor="middle" fill="${ink}">${label}</text>
  </svg>`;
  const bucket = row.dogs.status === "pending" ? "listing-uploads" : "dog-photos";
  for (const [width, path] of [
    [480, row.path_480],
    [960, row.path_960],
    [1600, row.path_1600],
  ]) {
    const body = await sharp(Buffer.from(svg)).resize(width).webp({ quality: 80 }).toBuffer();
    const up = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "image/webp", "x-upsert": "true", "Cache-Control": "max-age=31536000" },
      body,
    });
    if (!up.ok) throw new Error(`upload ${path} failed: ${up.status} ${await up.text()}`);
  }
  console.log(`${bucket}: ${row.path_480.replace("-480.webp", "")} ×3`);
}
