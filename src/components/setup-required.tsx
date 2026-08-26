import { DatabaseIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code";

/** The steps, in order. Each is one `t.rich` message. */
const STEPS = ["step1", "step2", "step3", "step4"] as const;

/** Shown instead of a stack trace when the Supabase env vars are missing. */
export function SetupRequired() {
  const t = useTranslations("setup");

  /*
   * The file names inside the steps stay in the language the files are named
   * in, so they are carried as tags rather than translated into the sentence
   * around them.
   */
  const tags = {
    code: (chunks: React.ReactNode) => <Code>{chunks}</Code>,
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
        {STEPS.map((step) => (
          <li key={step}>{t.rich(step, tags)}</li>
        ))}
      </ol>
      <p className="text-muted-foreground text-sm">{t.rich("docs", tags)}</p>
    </Card>
  );
}
