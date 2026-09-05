/**
 * Which URLs a visitor with no session may reach, and where the rest are sent.
 *
 * Pure and dependency-free so `src/proxy.ts` can import it and a test can too —
 * the proxy itself pulls in `@supabase/ssr`, which has no business in a unit
 * test. docs/decisions/identity-and-sessions.md#sessions
 */

/**
 * Where a visitor with no session is sent — and therefore itself public. Bounce
 * a signed-out visitor from here to here and the browser loops forever, so the
 * redirect target and the exempt list have to name the same constant rather
 * than agree by coincidence.
 */
export const SIGNED_OUT_HOME = "/";

/**
 * Reachable without a session. `/auth/*` is excluded by the matcher instead.
 *
 * `/join/*` has to be here too: the route handler behind it is what sends a
 * signed-out visitor on to the sign-in page with a `returnTo`, and it never
 * gets the chance if the redirect fires first.
 *
 * `/privacy` and `/terms` are read by people deciding whether to sign in at all
 * — and by Google's OAuth review, which fetches them signed out. Listing them
 * here rather than excluding them from the matcher keeps their session refresh,
 * which is the only reason the matcher exists.
 */
export function isPublic(pathname: string): boolean {
  return (
    pathname === SIGNED_OUT_HOME ||
    pathname.startsWith("/join/") ||
    pathname === "/privacy" ||
    pathname === "/terms"
  );
}

/**
 * The sign-in page's URL, with the two query parameters it reads.
 *
 * Four places send somebody there — a failed OAuth start, the callback, a
 * signed-out invite and `/start` — and `src/app/page.tsx` is the only thing
 * that reads them back. Built here so that contract has one owner rather than
 * four template literals that must agree, and so each of them names
 * `SIGNED_OUT_HOME` instead of spelling it out.
 *
 * Values arrive raw: the encoding is this function's job, and a caller doing it
 * as well would escape twice.
 */
export function signInPath(params?: {
  error?: string;
  returnTo?: string;
}): string {
  const query = new URLSearchParams();
  if (params?.error) query.set("error", params.error);
  if (params?.returnTo) query.set("returnTo", params.returnTo);

  const search = query.toString();
  return search ? `${SIGNED_OUT_HOME}?${search}` : SIGNED_OUT_HOME;
}
