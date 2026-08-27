import { LegalShell } from "@/components/legal-shell";

/**
 * The English legal pages. `(legal)` adds nothing to either URL, so these are
 * `/en/privacy` and `/en/terms` — the hreflang twins of the pages under
 * `src/app/(legal)/`, rendering the same documents in the language
 * `src/proxy.ts` pins from the URL.
 * docs/decisions/language.md#the-public-pages-pin-their-locale
 *
 * `/en` itself is not under this group: it is the landing page, and it owes no
 * "back to the app" link because it *is* where that link goes.
 *
 * Deliberately no `dynamic` export — the root layout governs that.
 */
export default function EnglishLegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LegalShell>{children}</LegalShell>;
}
