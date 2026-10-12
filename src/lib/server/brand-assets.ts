import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseColorTokens } from "@/lib/tokens";

// Build-time assets for generated images (OG, apple-icon). Satori can't read CSS variables.
const root = process.cwd();

export async function brandAssets() {
  const [css, logo, icon, font] = await Promise.all([
    readFile(join(root, "src/app/tokens.css"), "utf8"),
    readFile(join(root, "public/brand/logo-primary.svg")),
    readFile(join(root, "public/brand/icon.svg")),
    readFile(join(root, "node_modules/@fontsource/unbounded/files/unbounded-latin-800-normal.woff")),
  ]);
  const svg = (b: Buffer) => `data:image/svg+xml;base64,${b.toString("base64")}`;
  return { colors: parseColorTokens(css), logo: svg(logo), icon: svg(icon), font };
}
