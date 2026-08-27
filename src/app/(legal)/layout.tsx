import { LegalShell } from "@/components/legal-shell";

/**
 * `(legal)` adds nothing to either URL. It exists for the same reason `(app)`
 * does, from the other side: these two pages sit *outside* the session.
 *
 * The English twins live under `src/app/en/(legal)/` and render the same shell.
 * docs/decisions/language.md#the-public-pages-pin-their-locale
 *
 * Deliberately no `dynamic` export — the root layout governs that, and a
 * different value here would silently override it.
 */
export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LegalShell>{children}</LegalShell>;
}
