import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh, and a first cheap look at whether anyone is signed in.
 *
 * This file is `proxy.ts`, not `middleware.ts`. Next.js 16 renamed the
 * convention; Supabase's published guides still say middleware, and a file by
 * that name here would simply never run. See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Two jobs, in order of importance:
 *
 *   1. Refresh the access token and write the rotated cookies onto the response.
 *      Server Components cannot set cookies, so without this the session would
 *      quietly expire mid-visit and everyone would be thrown back to the login
 *      screen an hour after signing in.
 *   2. Bounce visitors with no session straight to /login, so they never pay for
 *      a render they cannot see.
 *
 * Job 2 is a convenience and nothing more. The Next docs are explicit that a
 * proxy must not be the only line of defence, and it is not: every page resolves
 * access again through resolveAccess, and every Server Action re-derives the
 * caller for itself. Deleting this file would cost speed, not safety.
 *
 * It also cannot do the whole job. Whether someone is *approved* lives in the
 * family_members table, which only the service_role key can read — that key has
 * no business in an edge proxy, so the pending check happens in the pages.
 */

/**
 * Reachable without a session. /auth/* is excluded by the matcher instead, so
 * nothing here can touch the half-finished OAuth exchange.
 */
function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Nothing is configured yet. Let the request through so the pages can render
  // <SetupRequired /> and say so, rather than redirecting to a login screen that
  // could not possibly work.
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

  // Do not remove this call, and do not put anything between it and the
  // response. It is what actually performs the refresh above.
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
     * Everything except:
     *
     *   * Next's own static output.
     *   * /auth/* — the OAuth round trip. The callback route sets the session
     *     cookies itself, and it holds a one-shot PKCE verifier while it does.
     *     There is nothing for this file to refresh there and everything to
     *     get wrong, so it stays out of the way.
     *   * /manifest.webmanifest, /icon, /apple-icon — the PWA install metadata.
     *     These are fetched by the browser and the OS outside any normal
     *     navigation, and redirecting them to an HTML login page breaks
     *     installing the app.
     *   * Static image files.
     */
    "/((?!_next/static|_next/image|auth/|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
