import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * `(legal)` adds nothing to either URL. It exists for the same reason `(app)`
 * does, from the other side: these two pages sit *outside* the session, so they
 * get no header and owe the `<main className="flex-1">` the root layout does not
 * provide. docs/decisions/ui-patterns.md#layout-contract
 *
 * Deliberately no `dynamic` export — the root layout governs that, and a
 * different value here would silently override it.
 */
export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = useTranslations("legal");
  return (
    <main className="flex-1">
      {/*
       * The only chrome these pages get. `/` sends a stranger on to `/login` and
       * a member to their group, so one link serves both.
       */}
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeftIcon className="size-4 shrink-0" />
        {t("backToApp")}
      </Link>

      {children}
    </main>
  );
}
