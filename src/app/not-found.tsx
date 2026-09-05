import Link from "next/link";
import { MapPinOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The 404, and there is only one of it — it catches both `notFound()` from
 * anywhere under /g/[groupId] and any unmatched URL. Keeping one file is
 * deliberate; see docs/decisions/ui-patterns.md#the-404.
 *
 * It keeps a labelled way back of its own even though the header above carries
 * one: this is the page's whole action, and a bare glyph in the corner is not
 * the same offer.
 *
 * Nothing is fetched here and nobody is redirected from here — but do not read
 * that as "a wrong address always shows this page". proxy.ts bounces a
 * signed-out visitor off any path that is not public, so in practice this is a
 * screen for people who already have a session.
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinOffIcon className="text-primary size-6 shrink-0" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <Button size="lg" asChild className="w-full">
        <Link href="/">{t("back")}</Link>
      </Button>
    </Card>
  );
}
