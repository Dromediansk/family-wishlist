import { defineConfig, devices } from "@playwright/test";

/**
 * Journeys against the local Docker stack. What belongs here and what does not:
 * docs/decisions/testing.md
 *
 * The env files are loaded by hand because Playwright is not `next dev` and
 * does not read them. Only the development pair is ever loaded — the fixtures
 * hold service_role, and .env.production.local must not be reachable from a
 * test run even by accident.
 */
for (const file of [".env.development", ".env.development.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // .env.development.local is optional; .env.development is committed.
  }
}

/** Not 3000: a checkout's own `npm run dev` usually holds it. */
const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    /* The invite link only ever exists in the clipboard — src/components/invites.tsx. */
    permissions: ["clipboard-read", "clipboard-write"],
    /*
     * Chromium otherwise sends the operator's OS locale as Accept-Language,
     * which src/i18n/config.ts#pickLocale honors — so a run's language, and
     * therefore sk.login.signIn matching, would depend on the machine it runs
     * on rather than the app's own Slovak default.
     */
    locale: "sk-SK",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    /* The stated primary reader is a grandparent on a phone. */
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
