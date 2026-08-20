import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/data/access";
import { RETURN_TO_COOKIE, safeReturnTo } from "@/lib/invites";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * The other half of signInWithGoogle: trade Google's one-time code for a
 * session. The app's only route handler, because Google navigates here directly
 * with a query string.
 *
 * A trigger creates the app_users row on first sign-in; this handler only repairs
 * the one case the trigger cannot reach — see ensureAppUser.
 *
 * Somebody who came in on an invite link goes back to it: `signInWithGoogle`
 * left the path in a cookie, `safeReturnTo` re-checks it here, and the cookie is
 * spent either way. Everyone else lands on `/`.
 * docs/content/groups.md#invites
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

  const store = await cookies();
  const returnTo = safeReturnTo(store.get(RETURN_TO_COOKIE)?.value);

  // Whether this person belongs to any group — or none, or nothing at all — is
  // decided by resolveAccess on the way in; the callback deliberately does not
  // know. An invite path is the one thing it will act on, and `/join/{token}`
  // re-derives every check for itself.
  const response = NextResponse.redirect(
    `${redirectBase(request, origin)}${returnTo ?? "/"}`,
  );
  // One trip only: a link that was already opened must not be reopened by the
  // next sign-in from this browser.
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
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
