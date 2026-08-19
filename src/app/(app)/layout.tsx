import { SiteHeader } from "@/components/site-header";

/**
 * The chrome a signed-in member wears, and the reason this route group exists.
 *
 * `(app)` adds nothing to any URL — `(app)/(home)/page.tsx` is still `/`, and
 * `(app)/member/[id]` is still `/member/[id]`. Its only job is to draw a line
 * between the routes that have a session behind them and the two surfaces a
 * stranger can reach: `/login` and the 404. A sign-in screen topped by a
 * wordmark linking to a route that redirects straight back, beside a `Suspense`
 * hole where an account menu is never going to arrive, is chrome pretending
 * there is an app behind it.
 *
 * The line is "has a session", not "is approved": `/pending` sits inside the
 * group and does get the header, with the account half empty because
 * `SiteHeader` fills it only for an approved member. That is the accepted edge —
 * a pending visitor is somebody, just not somebody the app will talk to yet —
 * and that page carries its own sign-out button. A future route for a
 * half-signed-in state belongs on the same side of the line.
 *
 * `<main>` had to come along, and it needs its `flex-1`; the root layout holds
 * the reason every child owns one.
 *
 * Deliberately absent:
 *
 * - No `dynamic` export. The root layout's `force-dynamic` already governs this
 *   group, so re-declaring it would only add a second place to get it wrong —
 *   and a *different* value here would silently override the root for every
 *   route under it.
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
