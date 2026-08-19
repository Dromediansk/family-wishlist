/**
 * `/login` sits outside `(app)` — no header, on purpose — so it owes the
 * `<main className="flex-1">` the root layout does not provide.
 *
 * A layout rather than a wrapper in the page, because the page returns
 * `<SetupRequired />` early and a per-page wrapper would escape it. The centring
 * stays on the page: `SetupRequired` is a card, not a hero.
 */
export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <main className="flex-1">{children}</main>;
}
