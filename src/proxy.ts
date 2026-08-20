import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh, plus a cheap early redirect for signed-out visitors.
 *
 * `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention, and
 * Supabase's guides still say middleware. See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * The redirect is an optimisation, never the defence: every page resolves access
 * again and every Server Action re-derives its caller. Deleting this file would
 * cost speed, not safety. docs/content/membership.md#sessions
 */

/**
 * Reachable without a session. /auth/* is excluded by the matcher instead.
 *
 * /join/* has to be here too: the route handler behind it is what sends a
 * signed-out visitor on to /login?returnTo=..., and it never gets the chance
 * if this redirect fires first.
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/join/")
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        response = NextResponse.next({ request });
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
     * PWA metadata routes (redirecting those to HTML breaks installing).
     */
    "/((?!_next/static|_next/image|auth/|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
