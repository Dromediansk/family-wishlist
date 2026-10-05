import { CalendarIcon, CalendarX2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { isNeededByPast } from "@/lib/needed-by";
import { formatDate } from "@/lib/utils";

/**
 * A wish's needed-by day, or nothing. Once passed it goes quiet rather than
 * red — it is a fact about the owner, not an error — and the icon changes too,
 * so colour is never the only signal.
 */
export function NeededBy({ date }: { date: string | null }) {
  const t = useTranslations("wishes.neededBy");
  const locale = useLocale();
  if (date === null) return null;

  const formatted = formatDate(date, locale);
  const passed = isNeededByPast(date);
  const Icon = passed ? CalendarX2Icon : CalendarIcon;

  return (
    <p
      className={
        passed
          ? "text-muted-foreground flex items-center gap-1.5"
          : "flex items-center gap-1.5 font-medium"
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {passed
        ? t("passed", { date: formatted })
        : t("upcoming", { date: formatted })}
    </p>
  );
}
