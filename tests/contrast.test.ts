import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseColorTokens } from "../src/lib/tokens";

// Recomputes the DESIGN.md §3 contrast table from tokens.css (WCAG 2.x relative luminance).
const t = parseColorTokens(readFileSync("src/app/tokens.css", "utf8"));

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
export const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const BODY = 4.5;
const LARGE = 3;

// [fg, bg, minimum the design allows it for]
const allowed: [string, string, number][] = [
  ["ink", "bg", BODY],
  ["ink", "surface", BODY],
  ["ink", "highlight", BODY],
  ["ink", "fresh", BODY],
  ["ink", "bubble", BODY],
  ["ink", "primary", BODY],
  ["muted", "bg", BODY],
  ["muted", "surface", BODY],
  ["muted", "highlight", BODY],
  ["muted", "fresh", LARGE], // large text only
  ["bg", "ink", BODY], // reversed logo, dark chips
];

describe("DESIGN.md §3 contrast", () => {
  it.each(allowed)("%s on %s meets %d:1", (fg, bg, min) => {
    expect(t[fg], `token --${fg}`).toBeDefined();
    expect(t[bg], `token --${bg}`).toBeDefined();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
  });

  it("white on Tangerine stays banned (below 4.5:1)", () => {
    expect(ratio(t.surface!, t.primary!)).toBeLessThan(BODY);
  });

  it("Mauve on Mint is below body-text contrast, so large text only", () => {
    expect(ratio(t.muted!, t.fresh!)).toBeLessThan(BODY);
  });
});
