/**
 * `/login` sits outside `(app)` — no header, on purpose — so it owns the
 * `<main>` the root layout no longer provides.
 *
 * A layout rather than a wrapper inside the page, because the page has an early
 * `return <SetupRequired />` that a per-page wrapper would escape. `flex-1` is
 * load-bearing: it fills `min-h-dvh`, which is both what lets the hero centre
 * itself against `min-h-full` and what keeps <InstallPrompt /> on the bottom
 * edge under a short page.
 */
export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <main className="flex-1">{children}</main>;
}
