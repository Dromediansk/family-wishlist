"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAuthClient } from "@/lib/supabase-auth";

/**
 * Where Google should send the browser back to.
 *
 * Derived from the incoming request rather than an environment variable, so
 * localhost, preview deployments and production each get their own correct
 * value with nothing to configure. Set NEXT_PUBLIC_SITE_URL to override — worth
 * doing if you ever end up behind a proxy that rewrites Host.
 *
 * Whatever this resolves to must also be listed under Redirect URLs in the
 * Supabase dashboard, or Supabase will refuse to bounce the browser back here.
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
 * Start the Google sign-in flow.
 *
 * The whole exchange stays on the server: `skipBrowserRedirect` makes Supabase
 * hand back the authorize URL instead of navigating, we store the PKCE verifier
 * in a cookie on the way out, and /auth/callback trades the code for a session
 * on the way back. No Supabase auth client is ever created in the browser, so
 * no session lands in localStorage where a script could read it.
 */
export async function signInWithGoogle() {
  const supabase = await createAuthClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Prihlásenie sa nepodarilo spustiť.")}`,
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
