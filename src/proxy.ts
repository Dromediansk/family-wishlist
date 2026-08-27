import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_HEADER } from "@/i18n/config";
import { publicPageLocale } from "@/lib/site-url";

/**
 * Session refresh, plus a cheap early redirect for signed-out visitors.
 *
 * `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention, and
 * Supabase's guides still say middleware. See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * The redirect is an optimisation, never the defence: every page resolves access
 * again and every Server Action re-derives its caller. Deleting this file would
 * cost speed, not safety. docs/decisions/identity-and-sessions.md#sessions
 */

/**
 * Reachable without a session. /auth/* is excluded by the matcher instead.
 *
 * /join/* has to be here too: the route handler behind it is what sends a
 * signed-out visitor on to /login?returnTo=..., and it never gets the chance
 * if this redirect fires first.
 *
 * The rest is the public surface a crawler reads — `/`, `/privacy`, `/terms`
 * and their English twins, all of which `publicPageLocale` names. They are also
 * what Google's OAuth review fetches while signed out. Listing them here rather
 * than excluding them from the matcher keeps their session refresh, which is
 * the only reason the matcher exists.
 */
function isPublic(pathname: string): boolean {
  return (
    publicPageLocale(pathname) !== null ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/join/")
  );
}

export async function proxy(request: NextRequest) {
  /**
   * A public page says which language it is in — Slovak at `/privacy`, English
   * at `/en/privacy` — so the URL answers, not the reader's cookie. Everywhere
   * else the cookie still decides and this header is absent.
   *
   * Always rebuilt from `request.headers`, never snapshotted: `setAll` below
   * writes refreshed session cookies onto the request, and those have to reach
   * the render too. An inbound copy is dropped, so a visitor cannot claim a
   * language for a page that has one of its own.
   * docs/decisions/language.md#the-public-pages-pin-their-locale
   */
  const pageLocale = publicPageLocale(request.nextUrl.pathname);
  const forwarded = () => {
    const headers = new Headers(request.headers);
    if (pageLocale) headers.set(LOCALE_HEADER, pageLocale);
    else headers.delete(LOCALE_HEADER);
    return { headers };
  };

  let response = NextResponse.next({ request: forwarded() });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Unconfigured: let the request through so the pages can render
  // <SetupRequired /> rather than a login screen that could not work.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: forwarded() });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove this call or put anything between it and the response — it is
  // what performs the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except Next's static output, static images, /auth/* (the
     * callback sets its own cookies and holds a one-shot PKCE verifier) and the
     * metadata routes.
     *
     * The metadata routes are excluded rather than listed in `isPublic()`
     * because none of them is HTML and none has a session to refresh: bouncing
     * them to a login page breaks installing the app (`manifest.webmanifest`,
     * `icon`, `apple-icon`) and hides the site from every crawler there is
     * (`robots.txt`, `sitemap.xml`, `opengraph-image`). A redirected robots.txt
     * fails silently — it answers 307, which reads as "no rules" — so this line
     * is the whole of what makes the public pages findable.
     */
    "/((?!_next/static|_next/image|auth/|manifest.webmanifest|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
