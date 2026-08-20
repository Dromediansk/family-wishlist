import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * The other half of signInWithGoogle: trade Google's one-time code for a
 * session. The app's only route handler, because Google navigates here directly
 * with a query string.
 *
 * A trigger creates the app_users row on first sign-in; this handler only repairs
 * the one case the trigger cannot reach — see ensureAppUser.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Google's own failures — usually "cancel" on the consent screen.
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const failed = (message: string) =>
    NextResponse.redirect(
      `${redirectBase(request, origin)}/login?error=${encodeURIComponent(message)}`,
    );

  if (oauthError) return failed(oauthError);
  if (!code) return failed("Prihlásenie sa nedokončilo. Skús to znova.");

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return failed(error.message);

  if (data.user) await ensureAppUser(data.user.id, data.user.email ?? null);

  // Whether this person belongs to any group — or none, or nothing at all — is
  // decided by resolveAccess on the way in; the callback deliberately does not
  // know.
  return NextResponse.redirect(`${redirectBase(request, origin)}/`);
}

/**
 * Ensure an app_users row exists when a Google account here has no row in the
 * app's identity table. Without this they loop between /login and / forever.
 *
 * See docs/content/groups.md for how the app models membership and access.
 */
async function ensureAppUser(
  authUserId: string,
  email: string | null,
): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  // Don't strand a sign-in that otherwise worked — a missing app_users row reads
  // as signed out, which is the safe direction.
  if (lookupError) {
    console.warn("Could not check for an existing app_users row:", lookupError);
    return;
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("app_users").insert({
    auth_user_id: authUserId,
    email,
    name: email?.split("@")[0]?.slice(0, 50) || "Bez mena",
  });

  // 23505 means the trigger got there first — the normal path, not a problem.
  if (insertError && insertError.code !== "23505") {
    console.warn("Could not create the app_users row:", insertError);
    return;
  }
}

/**
 * Behind a load balancer `origin` is the internal URL, so prefer the forwarded
 * host. There is no balancer in front of `next dev`.
 */
function redirectBase(request: Request, origin: string): string {
  if (process.env.NODE_ENV === "development") return origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  return forwardedHost ? `https://${forwardedHost}` : origin;
}
