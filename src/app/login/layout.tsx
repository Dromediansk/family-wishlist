/**
 * `/login` sits outside `(app)` — no header, on purpose — so it owns the
 * `<main className="flex-1">` the root layout no longer provides; that file
 * holds the reason, including why the `flex-1` is load-bearing.
 *
 * A layout rather than a wrapper inside the page, because the page has an early
 * `return <SetupRequired />` that a per-page wrapper would escape, and wrapping
 * both returns would write the same element twice in one file. The centring
 * stays on the page rather than moving here: `SetupRequired` is a card, not a
 * hero, and `max-w-sm text-center` would be wrong for it.
 */
export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <main className="flex-1">{children}</main>;
}
