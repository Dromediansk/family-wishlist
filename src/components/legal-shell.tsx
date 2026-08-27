import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { localisedPath } from "@/lib/site-url";

/**
 * The chrome both legal layouts render — the Slovak pages under `(legal)` and
 * their English twins under `en/(legal)`. Two layouts because the URLs differ,
 * one component because the page does not.
 *
 * These pages sit outside the session, so they get no header and owe the
 * `<main className="flex-1">` the root layout does not provide.
 * docs/decisions/ui-patterns.md#layout-contract
 */
export function LegalShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = useTranslations("legal");
  const locale = useLocale();

  return (
    <main className="flex-1">
      {/*
       * The only chrome these pages get. `/` shows a stranger what the app is
       * and sends a member to their group, so one link serves both — localised,
       * because an English reader belongs on `/en`.
       */}
      <Link
        href={localisedPath("/", locale)}
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeftIcon className="size-4 shrink-0" />
        {t("backToApp")}
      </Link>

      {children}
    </main>
  );
}
