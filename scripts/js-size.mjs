// First-load JS per route, brotli (the JS budget's unit). Excludes noModule polyfills, which modern
// browsers never download. "shared" = chunks every given route loads (framework baseline); "own" =
// the rest, checked against per-route budgets (docs: M2 and M3 decisions). Pass at least two routes.
// Usage: npm run build && npm run start, then: node scripts/js-size.mjs / /dogs /dogs/some-slug
import { brotliCompressSync, gzipSync } from "node:zlib";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const SHARED_KB = 110.2; // M1 framework baseline (108.2KB) + 2KB allowance
const OWN_KB = [
  [/^\/list/, 35],
  [/^\/match/, 30],
  [/^\/r\/[^/]+\/[^/]+\/interested/, 28],
  [/^\/r\//, 8],
  [/^\/admin/, 15],
  [/^\/dogs\/./, 8],
  [/^\/dogs/, 12],
  [/^\/$/, 8],
  [/./, 8],
];

const kb = (n) => (n / 1024).toFixed(1);
const br = (bufs) => brotliCompressSync(Buffer.concat(bufs)).length;
const cache = new Map();
const get = async (s) => cache.get(s) ?? cache.set(s, Buffer.from(await (await fetch(base + s)).arrayBuffer())).get(s);

const routes = process.argv.slice(2);
const chunks = {};
for (const route of routes) {
  const html = await (await fetch(base + route)).text();
  chunks[route] = [
    ...new Set(
      [...html.matchAll(/<script\b([^>]*)>/g)]
        .filter(([, attrs]) => !/noModule/i.test(attrs))
        .map(([, attrs]) => /src="([^"]+\.js)"/.exec(attrs)?.[1])
        .filter(Boolean),
    ),
  ];
}
const shared = routes.length > 1 ? chunks[routes[0]].filter((c) => routes.every((r) => chunks[r].includes(c))) : [];
const sharedBr = br(await Promise.all(shared.map(get)));
let over = shared.length > 0 && sharedBr / 1024 > SHARED_KB;
console.log(`shared (framework)       ${shared.length} chunks  brotli ${kb(sharedBr)}KB  (cap ${SHARED_KB}KB)`);

for (const route of routes) {
  const all = await Promise.all(chunks[route].map(get));
  const own = await Promise.all(chunks[route].filter((c) => !shared.includes(c)).map(get));
  const total = br(all);
  const ownBr = own.length ? br(own) : 0;
  const cap = OWN_KB.find(([re]) => re.test(route.split("?")[0]))[1];
  const bad = ownBr / 1024 > cap;
  over ||= bad;
  console.log(
    `${route.padEnd(24)} ${String(chunks[route].length).padStart(2)} chunks  brotli ${kb(total)}KB  own ${kb(ownBr)}KB (cap ${cap}KB)  gzip ${kb(gzipSync(Buffer.concat(all), { level: 9 }).length)}KB${bad ? "  OVER" : ""}`,
  );
}
process.exit(over ? 1 : 0);
