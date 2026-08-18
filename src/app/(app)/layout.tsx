import { SiteHeader } from "@/components/site-header";

/**
 * The chrome a signed-in member wears, and the reason this route group exists.
 *
 * `(app)` adds nothing to any URL — `(app)/(home)/page.tsx` is still `/`, and
 * `(app)/member/[id]` is still `/member/[id]`. Its only job is to draw a line
 * between the routes that have somebody behind them and the two surfaces a
 * stranger can reach: `/login` and the 404. A sign-in screen topped by a
 * wordmark linking to a route that redirects straight back, beside a `Suspense`
 * hole where an account menu is never going to arrive, is chrome pretending
 * there is an app behind it.
 *
 * `<main>` had to come along. `<header>` is the `banner` landmark only while it
 * is *not* inside `<main>`; leaving `<main>` in the root layout would have
 * nested one in the other and quietly demoted the header to a plain element for
 * anyone navigating by landmark. Routes outside this group bring their own —
 * see `login/layout.tsx` and `not-found.tsx` — and they need the `flex-1` too:
 * it is what fills `min-h-dvh` and keeps <InstallPrompt /> on the bottom edge of
 * a short page.
 *
 * Deliberately absent:
 *
 * - No `dynamic` export. Route segment config is reduced over every segment from
 *   the root down and the last *defined* value wins, so the root layout's
 *   `force-dynamic` still governs everything here. Declaring it again would only
 *   create a second place to get it wrong — and a different value here would
 *   silently override the root for the whole group.
 * - No `loading.tsx` beside this file. It would become the fallback for the
 *   entire group and flash in front of each route's own skeleton, which is
 *   exactly what `(home)/loading.tsx` exists to prevent. Nothing here awaits:
 *   `SiteHeader` returns immediately and keeps its database round trip behind
 *   its own `Suspense`, so no route's skeleton waits on it.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
