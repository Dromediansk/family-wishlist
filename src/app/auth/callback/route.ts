import { NextResponse } from "next/server";

import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * The other half of signInWithGoogle: Google sent the browser back here with a
 * one-time code, and we trade it for a session.
 *
 * This is the only route handler in the app — everything else is a Server
 * Component or a Server Action. It has to be a route handler because Google
 * navigates here directly with a query string.
 *
 * A trigger on auth.users creates the member row (0003_auth.sql), so first-time
 * sign-ins arrive here with one already waiting. This handler only repairs the
 * one case the trigger cannot reach — see rejoinTheQueue below.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Google's own failures — the user hit "cancel" on the consent screen, most
  // often. Pass the reason along rather than reporting a generic failure.
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

  // Straight to the home page. Whether this person is approved yet is decided
  // there, by resolveAccess — the callback deliberately does not know.
  return NextResponse.redirect(`${redirectBase(request, origin)}/`);
}

/**
 * Put someone back in the approval queue if they have a Google account here but
 * no member row.
 *
 * This is the one gap the trigger cannot cover, and without it the app has a
 * trap. The trigger fires on INSERT into auth.users — once, ever. So after an
 * admin rejects or removes someone, their auth user survives, signing in again
 * creates nothing, and they end up with a valid session and no member row:
 * resolveAccess reads that as signed-out, every page sends them to /login, and
 * /login sends them back here. Round and round, with nothing on screen to
 * explain it.
 *
 * So they land back in the queue as `pending`, which is also what the admin
 * would expect: rejecting someone is a "not today", not a ban. To bar someone
 * for good, delete the user under Authentication in the Supabase dashboard —
 * that cascades the member row away and stops them signing in at all.
 *
 * Never bootstraps an admin. That is the trigger's job, on a genuinely empty
 * table; doing it here would hand the family to whoever removed themselves last.
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

  // Don't strand a sign-in that otherwise worked. The pages handle a missing
  // member row by treating them as signed out, which is the safe direction.
  if (lookupError) {
    console.warn("Could not check for an existing member row:", lookupError);
    return;
  }
  // The known gap: on a genuinely new sign-up the auth.users trigger
  // (0003_auth.sql) always wins this race, so `existing` is already set and we
  // return here without ever pinging. That leaves an admin's cached /family
  // queue stale for up to the staleTimes ceiling. Detecting "was this insert
  // done by the trigger, just now" would need more than this handler has
  // cheaply available, for a bounded staleness on one admin-only page — not
  // worth it. Not fixed here.
  if (existing) return;

  const { error: insertError } = await supabase.from("family_members").insert({
    auth_user_id: authUserId,
    email,
    name: email?.split("@")[0]?.slice(0, 50) || "Bez mena",
    role: "member",
    status: "pending",
  });

  // 23505 means the trigger got there first on a genuinely new account, which
  // is the normal path and not a problem.
  if (insertError && insertError.code !== "23505") {
    console.warn("Could not re-create the member row:", insertError);
    return;
  }

  // Only other open tabs need this: the browser that just signed in is doing a
  // full document load, so its own Client Cache is empty regardless of
  // whether we ping. No revalidatePath here — this handler responds with a
  // redirect, not a render, so there is no route on this request to
  // revalidate; the point is telling *other* tabs a member row appeared.
  await notifyChanged();
}

/**
 * `origin` is the URL this handler was reached at, which behind a load balancer
 * is the internal one. Prefer the forwarded host so the browser is sent back to
 * the address it actually typed, and keep the local case simple — there is no
 * balancer in front of `next dev`.
 */
function redirectBase(request: Request, origin: string): string {
  if (process.env.NODE_ENV === "development") return origin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  return forwardedHost ? `https://${forwardedHost}` : origin;
}
