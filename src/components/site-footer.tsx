import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LEGAL_DETAILS } from "@/lib/legal";

/**
 * The bar at the bottom of every page, signed in or not: the two legal pages
 * have to be reachable from `/`, the surface a stranger — or Google's OAuth
 * reviewer — reaches first. The header is mounted alongside it in the root
 * layout for the same reason.
 *
 * Nothing here is fetched and nothing is interactive, so it stays a Server
 * Component and costs the document nothing.
 */
export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="text-muted-foreground mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-6 text-sm">
      {/* The maker's name is a tag rather than a second message, so the
          sentence around it stays one translatable string. The address comes
          from `legal.ts`, the same value the operator card on /privacy and
          /terms links to — a domain change is one edit, not three. */}
      <p>
        {t.rich("copyright", {
          bitloom: (chunks: React.ReactNode) => (
            <a
              href={LEGAL_DETAILS.operatorWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {chunks}
              <ExternalLinkIcon className="size-3.5 shrink-0" />
              <span className="sr-only">{t("bitloomSite")}</span>
            </a>
          ),
        })}
      </p>

      {/* Named, because two bare links in a landmark tell a screen reader
          nothing about what they are for. */}
      <nav
        aria-label={t("legalNav")}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {/* The `link` variant's classes from ui/button.tsx, without its sizing:
            these are labels in a row of text, not controls. */}
        <Link
          href="/privacy"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("privacy")}
        </Link>
        <Link
          href="/terms"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}
