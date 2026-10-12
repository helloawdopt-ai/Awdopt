// First-load JS per route, brotli (the JS budget's unit). Excludes noModule polyfills, which modern
// browsers never download. Usage: npm run build && npm run start, then: node scripts/js-size.mjs / /brand
import { brotliCompressSync, gzipSync } from "node:zlib";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const BUDGET_KB = 130;
let over = false;

for (const route of process.argv.slice(2)) {
  const html = await (await fetch(base + route)).text();
  const srcs = [...html.matchAll(/<script\b([^>]*)>/g)]
    .filter(([, attrs]) => !/noModule/i.test(attrs))
    .map(([, attrs]) => /src="([^"]+\.js)"/.exec(attrs)?.[1])
    .filter(Boolean);
  const js = Buffer.concat(
    await Promise.all([...new Set(srcs)].map(async (s) => Buffer.from(await (await fetch(base + s)).arrayBuffer()))),
  );
  const kb = (n) => (n / 1024).toFixed(1);
  const br = brotliCompressSync(js).length;
  over ||= br / 1024 > BUDGET_KB;
  console.log(
    `${route.padEnd(24)} ${srcs.length} chunks  brotli ${kb(br)}KB  gzip ${kb(gzipSync(js, { level: 9 }).length)}KB`,
  );
}
process.exit(over ? 1 : 0);
