"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { RETURN_TO_COOKIE, safeReturnTo } from "@/lib/invites";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * Where Google sends the browser back to. Derived from the request so every
 * environment is correct with nothing to configure; `NEXT_PUBLIC_SITE_URL`
 * overrides it behind a proxy that rewrites Host.
 *
 * Whatever this resolves to must be listed under Redirect URLs in Supabase.
 * docs/setup/deployment.md#after-the-first-deploy
 */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

/**
 * Start the Google sign-in flow. The whole exchange stays on the server, so no
 * session ever lands in localStorage.
 * docs/content/membership.md#where-the-oauth-exchange-happens
 *
 * Somebody who arrived on an invite link has a `returnTo` in the form. It is
 * re-validated here — the page that rendered it is no proof, since a Server
 * Action is reachable by direct POST — and stored in an httpOnly cookie for
 * `/auth/callback` to read. A cookie rather than the OAuth `redirect_to`:
 * the token in that path is permission to join a group, and Google has no
 * business holding it. docs/content/groups.md#invites
 */
export async function signInWithGoogle(formData?: FormData) {
  const returnTo = safeReturnTo(formData?.get("returnTo")?.toString());

  const store = await cookies();
  if (returnTo) {
    store.set(RETURN_TO_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Long enough for a consent screen, short enough that an abandoned
      // sign-in does not redirect a later one somewhere it did not ask for.
      maxAge: 600,
    });
  } else {
    // A stale cookie from an abandoned invite must not hijack this sign-in.
    store.delete(RETURN_TO_COOKIE);
  }

  const supabase = await createAuthClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    const message = encodeURIComponent(
      error?.message ?? "Prihlásenie sa nepodarilo spustiť.",
    );
    // Carries the invite along, so pressing the button again still lands in the
    // group rather than losing the link to a failed first attempt.
    const again = returnTo
      ? `&returnTo=${encodeURIComponent(returnTo)}`
      : "";
    redirect(`/login?error=${message}${again}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
