import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Same "@/…" alias as tsconfig.json, so unit tests can import app modules.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { exclude: ["tests/e2e/**", "node_modules/**"] },
});
