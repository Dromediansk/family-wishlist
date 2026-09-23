import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Not 3000: a checkout's own `npm run dev` usually holds it. */
export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

/**
 * The local stack's address and keys, and the guard that keeps them local.
 *
 * These fixtures hold service_role, which bypasses RLS on a database whose
 * whole protection is that nothing outside src/lib/data/ queries it. So this
 * has to be *incapable* of reaching the hosted project, not merely unlikely
 * to — the same reasoning as scripts/seed-dev.mjs.
 */
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function localStack() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY must all be set. They are committed in " +
        ".env.development, which playwright.config.ts loads — check that file " +
        "and .env.development.local.",
    );
  }

  const host = new URL(url).hostname;
  if (!LOOPBACK.has(host)) {
    throw new Error(
      `Refusing to run e2e against ${host} — this only ever runs against the ` +
        "local stack. Something is outranking .env.development.",
    );
  }

  return { url, serviceKey, anonKey };
}

let admin: SupabaseClient | undefined;

/** service_role. Every fixture write goes through this. */
export function adminClient(): SupabaseClient {
  if (admin) return admin;
  const { url, serviceKey } = localStack();
  admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/**
 * Random, not derived from the clock: desktop and phone run the same file at
 * once, a `Date.now()` id collides inside one millisecond, and GoTrue rejects
 * the second identical email on `users_email_partial_key`. Worker index does
 * not save it either — two projects can share one.
 */
export function newRunId(): string {
  return crypto.randomUUID().slice(0, 8);
}
