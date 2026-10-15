import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: "**/admin-weights.e2e.ts" },
    // Changes the shared weights and constraints, so it runs alone, after everything that scores.
    {
      name: "weights",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/admin-weights.e2e.ts",
      dependencies: ["chromium"],
    },
  ],
  // Production build, so headers and CSP match what Vercel serves.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Clear the data cache first: tests change dev data behind it (fixtures are deleted directly).
        command: `rm -rf .next/cache/fetch-cache && npm run build && npm run start -- -p ${PORT}`,
        port: PORT,
        timeout: 240_000,
        reuseExistingServer: true,
        // Cloudflare's published always-pass Turnstile test keys (not secrets) and a throwaway salt,
        // so the listing flow runs locally without real keys. Real keys only live in Vercel Production.
        env: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
          TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
          RATE_LIMIT_IP_SALT: randomBytes(32).toString("hex"),
        },
      },
});
