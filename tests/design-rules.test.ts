import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards for the DESIGN.md rules most likely to break.
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const source = walk("src").filter((f) => /\.(tsx?|css)$/.test(f));

describe("design rules", () => {
  it("no hex colours outside src/app/tokens.css", () => {
    const offenders = source
      .filter((f) => !f.endsWith("tokens.css") && !f.endsWith("logo-geometry.ts"))
      .filter((f) => /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/i.test(readFileSync(f, "utf8").replace(/&#\d+;/g, "")));
    expect(offenders).toEqual([]);
  });

  it("no emoji in the UI", () => {
    const emoji = /\p{Extended_Pictographic}/u;
    expect(source.filter((f) => emoji.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("no white text on Tangerine", () => {
    const bad = /bg-primary[^"]*text-(surface|bg)|text-(surface|bg)[^"]*bg-primary/;
    expect(source.filter((f) => bad.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
