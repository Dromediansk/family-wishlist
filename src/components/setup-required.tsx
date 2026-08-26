import { DatabaseIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CODE = "bg-muted rounded px-1.5 py-0.5 font-mono text-sm";

/** Shown instead of a stack trace when the Supabase env vars are missing. */
export function SetupRequired() {
  const t = useTranslations("setup");

  /*
   * The file names inside the steps stay in the language the files are named
   * in, so they are carried as tags rather than translated into the sentence
   * around them.
   */
  const tags = {
    code: (chunks: React.ReactNode) => <code className={CODE}>{chunks}</code>,
    strong: (chunks: React.ReactNode) => (
      <strong className="text-foreground">{chunks}</strong>
    ),
    dashboard: (chunks: React.ReactNode) => (
      <a
        className="text-primary underline underline-offset-4"
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
      >
        {chunks}
      </a>
    ),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="text-primary size-6 shrink-0" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <ol className="text-muted-foreground max-w-[62ch] list-decimal space-y-3 pl-5">
        <li>{t.rich("step1", tags)}</li>
        <li>{t.rich("step2", tags)}</li>
        <li>{t.rich("step3", tags)}</li>
        <li>{t("step4")}</li>
      </ol>
      <p className="text-muted-foreground text-sm">{t.rich("docs", tags)}</p>
    </Card>
  );
}
