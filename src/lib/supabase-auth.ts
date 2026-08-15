import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The Supabase client used for sessions — and only for sessions.
 *
 * This is a second client, separate from the service_role one in supabase.ts,
 * and the split is deliberate:
 *
 *   * This client holds the visitor's session and runs as *them*. Every table
 *     has row level security on with no policies, so it can read nothing. That
 *     is correct and must stay that way — see 0002_realtime.sql.
 *   * getSupabase() in supabase.ts holds the service_role key, bypasses RLS,
 *     and does all the actual data work.
 *
 * So: ask this one who you are, ask that one for the data. Never the reverse.
 * Calling `.from(...)` on this client is always a mistake — it would return
 * empty and read as "no rows" rather than "no access".
 */
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local — see .env.example.",
    );
  }

  const store = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. That is fine: proxy.ts
          // refreshes the session on every request before the render starts,
          // so by the time we get here the cookies are already current.
        }
      },
    },
  });
}

/**
 * The signed-in Google account, or null.
 *
 * `getUser` revalidates the token with Supabase rather than trusting whatever
 * the cookie decoded to, which is the point — a cookie is something the visitor
 * controls, and this whole change exists because the old one wasn't checked.
 */
export async function getAuthUser() {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
