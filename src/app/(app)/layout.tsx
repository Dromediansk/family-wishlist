import { SiteHeader } from "@/components/site-header";

/**
 * The chrome a signed-in member wears. `(app)` adds nothing to any URL — it
 * exists only to keep the header off `/login` and the 404. The line is "has a
 * session", not "is approved": `/pending` is inside the group.
 * docs/content/ui-patterns.md#the-app-route-group
 *
 * Deliberately absent: no `dynamic` export (the root layout already governs
 * this, and a different value here would silently override it) and no
 * `loading.tsx` (it would flash in front of each route's own skeleton).
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
