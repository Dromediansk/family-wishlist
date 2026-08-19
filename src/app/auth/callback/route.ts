import { NextResponse } from "next/server";

import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * The other half of signInWithGoogle: trade Google's one-time code for a
 * session. The app's only route handler, because Google navigates here directly
 * with a query string.
 *
 * A trigger creates the member row on first sign-in; this handler only repairs
 * the one case the trigger cannot reach — see rejoinTheQueue.
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

  if (data.user) await rejoinTheQueue(data.user.id, data.user.email ?? null);

  // Whether this person is approved is decided by resolveAccess on the way in;
  // the callback deliberately does not know.
  return NextResponse.redirect(`${redirectBase(request, origin)}/`);
}

/**
 * Put someone back in the queue as `pending` when they have a Google account
 * here but no member row. Without this they loop between /login and / forever.
 *
 * Never bootstraps an admin — that is the trigger's job on a genuinely empty
 * table. docs/content/membership.md#rejoining-the-queue
 */
async function rejoinTheQueue(
  authUserId: string,
  email: string | null,
): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("family_members")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  // Don't strand a sign-in that otherwise worked — a missing member row reads
  // as signed out, which is the safe direction.
  if (lookupError) {
    console.warn("Could not check for an existing member row:", lookupError);
    return;
  }
  // Known gap: on a genuinely new sign-up the trigger wins this race, so no
  // ping is sent and an admin's cached /family queue stays stale until they
  // reload. Not worth distinguishing, for one admin-only page.
  if (existing) return;

  const { error: insertError } = await supabase.from("family_members").insert({
    auth_user_id: authUserId,
    email,
    name: email?.split("@")[0]?.slice(0, 50) || "Bez mena",
    role: "member",
    status: "pending",
  });

  // 23505 means the trigger got there first — the normal path, not a problem.
  if (insertError && insertError.code !== "23505") {
    console.warn("Could not re-create the member row:", insertError);
    return;
  }

  // For other tabs only; this one is doing a full document load. No
  // revalidatePath — the handler answers with a redirect.
  await notifyChanged();
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
