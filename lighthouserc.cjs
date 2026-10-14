// Lighthouse budgets (mobile, simulated 4G: Lighthouse's default). Run against the Vercel preview:
//   LH_TARGET=https://<preview>.vercel.app npm run lhci
// (Not LHCI_*: LHCI turns those env vars into CLI flags, and LHCI_URL would override the URL list.)
// Previews sit behind Vercel Authentication; the bypass secret comes from .env.local.
const base = process.env.LH_TARGET ?? "http://localhost:3000";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

module.exports = {
  ci: {
    collect: {
      // Grows each milestone: /r/[token] joins in M3. The profile slug exists in the dev seed.
      url: ["/", "/dogs", "/dogs/sample-biscuit"].map((path) => base + path),
      numberOfRuns: 3,
      settings: bypass ? { extraHeaders: JSON.stringify({ "x-vercel-protection-bypass": bypass }) } : {},
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
        "server-response-time": ["error", { maxNumericValue: 600, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
