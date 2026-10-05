import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// West of UTC on purpose: a bare date read as UTC midnight lands on the
// previous day here, so a test of "same day everywhere" can actually fail —
// CI runs in UTC and the author's machine east of it, where it cannot.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
