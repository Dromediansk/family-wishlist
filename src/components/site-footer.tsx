import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { localisedPath } from "@/lib/site-url";

/**
 * The bar at the bottom of every page, signed in or not. Mounted by the root
 * layout rather than `(app)/layout.tsx` on purpose: the two legal pages have to
 * be reachable from `/login`, the surface a stranger — or Google's OAuth
 * reviewer — reaches first.
 *
 * Nothing here is fetched and nothing is interactive, so it stays a Server
 * Component and costs the document nothing.
 */
export function SiteFooter() {
  const t = useTranslations("footer");
  /*
   * The legal pages pin their language to their URL, so linking to `/privacy`
   * from an English page would hand the reader a Slovak policy. The locale here
   * is whatever this document is already being read in.
   */
  const locale = useLocale();
  return (
    <footer className="text-muted-foreground mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-6 text-sm">
      {/*
       * The year is read per render, which the root layout's force-dynamic
       * already guarantees — nothing here can be baked into a stale build.
       */}
      <p>{t("copyright", { year: new Date().getFullYear() })}</p>

      {/* Named, because two bare links in a landmark tell a screen reader
          nothing about what they are for. */}
      <nav
        aria-label={t("legalNav")}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {/* The `link` variant's classes from ui/button.tsx, without its sizing:
            these are labels in a row of text, not controls. */}
        <Link
          href={localisedPath("/privacy", locale)}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("privacy")}
        </Link>
        <Link
          href={localisedPath("/terms", locale)}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}
