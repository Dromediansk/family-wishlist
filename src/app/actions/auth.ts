"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
