import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The visitor's session, and only that. Runs as *them*, and every table has RLS
 * on with no policies, so it can read nothing.
 *
 * Ask this client who you are; ask `getSupabase()` for the data. Calling
 * `.from()` here is always a bug — it returns empty, which reads as "no rows"
 * rather than "no access". docs/content/privacy-rule.md
 */
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.production.local — see .env.example. In development they come from the committed .env.development.",
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
          // Server Components cannot write cookies. proxy.ts has already
          // refreshed the session, so the cookies are current anyway.
        }
      },
    },
  });
}

/**
 * The signed-in Google account, or null. `getUser` revalidates the token with
 * Supabase rather than trusting what the cookie decoded to — the cookie is
 * something the visitor controls.
 */
export async function getAuthUser() {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
