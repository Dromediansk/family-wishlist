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
    /*
     * `--hostname 127.0.0.1` matches `baseURL` above: the dev server's own
     * default origin for its dev-asset allowlist becomes `127.0.0.1` rather
     * than `localhost`, so `next.config.ts` no longer needs an
     * `allowedDevOrigins` entry for it — every client component would
     * otherwise stay inert, refused as cross-origin.
     *
     * It does *not*, however, reach every place Next's dev server stamps a
     * hostname: the App Router dev bundler's own RouterServerContext hostname
     * comes from `http://localhost:${port}` in
     * node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js,
     * ignoring `--hostname`. A Route Handler redirect built from
     * `request.url` (`src/app/join/[token]/route.ts`) still lands on
     * `localhost` regardless of this flag — see the comment in
     * e2e/journeys/invites.spec.ts.
     */
    command: `npm run dev -- --port ${PORT} --hostname 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
