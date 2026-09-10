import { useLocale, useTranslations } from "next-intl";

import { Code } from "@/components/ui/code";
import { LEGAL_DETAILS, type LegalDetailKey } from "@/lib/legal";
import { formatDate } from "@/lib/utils";

/**
 * The furniture the two legal pages share. Hand-rolled rather than reached for
 * with `@tailwindcss/typography`: two documents do not pay for a plugin, and the
 * type scale and the 62ch cap already say everything these pages need.
 * docs/decisions/ui-patterns.md#typography
 */

/**
 * One of the operator's details from `src/lib/legal.ts`, or a deliberately loud
 * gap where it should be. Filling that file turns every one of these into plain
 * text at once — there is nothing to edit here.
 */
export function Detail({ of }: Readonly<{ of: LegalDetailKey }>) {
  const t = useTranslations("legal");
  const value = LEGAL_DETAILS[of];

  if (value.trim() === "") {
    return (
      <span className="bg-destructive/15 text-destructive rounded px-1 font-medium">
        {t("missing", { hint: t(`hints.${of}`) })}
      </span>
    );
  }
  return value;
}

/**
 * The effective date, written the way the reader's language writes one — the
 * value is an ISO date, so it is the only detail that is read rather than named.
 * An unfilled one is still `Detail`'s red gap; there is one such mechanism.
 */
export function EffectiveFrom() {
  const locale = useLocale();
  const value = LEGAL_DETAILS.effectiveFrom;
  if (value.trim() === "") return <Detail of="effectiveFrom" />;
  return formatDate(value, locale);
}

/**
 * What a paragraph of policy may contain, in one place.
 *
 * The prose lives in `messages/*.json` — a policy is a document, and it reads as
 * one there rather than as forty fragments of JSX. What it cannot carry is the
 * markup, so these are handed to `t.rich` at each call site: the emphasis and
 * the code spans wrap text, and the operator's details are empty tags that
 * expand into a whole element.
 * docs/decisions/language.md
 */
export function useLegalTags() {
  /*
   * The operator's details are tags rather than values, and they are empty ones
   * — `<contactEmail></contactEmail>`. `t.rich` takes a function per tag and
   * only strings and numbers as values, so an element has to arrive as the
   * former; the chunks between the tags are always empty and are ignored.
   */
  const details = Object.fromEntries(
    (Object.keys(LEGAL_DETAILS) as LegalDetailKey[]).map((key) => [
      key,
      () => <Detail of={key} />,
    ]),
  ) as Record<LegalDetailKey, () => React.ReactNode>;

  return {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    em: (chunks: React.ReactNode) => <em>{chunks}</em>,
    code: (chunks: React.ReactNode) => <Code>{chunks}</Code>,
    ...details,
  };
}

/**
 * The operator's company identifiers, as the one sentence both pages carry —
 * the privacy page to finish identifying the controller, the terms to identify
 * the trader. One message rather than one per page: only the labels around the
 * numbers differ by language, and the numbers themselves come from `legal.ts`.
 */
export function LegalIdentifiers() {
  const t = useTranslations("legal");
  const tags = useLegalTags();
  return <p>{t.rich("identifiers", tags)}</p>;
}

export function LegalPage({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  const t = useTranslations("legal");
  return (
    <article>
      {/* No header renders above these pages, so this is the only heading. */}
      <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        {t.rich("effectiveFrom", {
          effectiveFrom: () => <EffectiveFrom />,
        })}
      </p>
      {children}
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-balance">{title}</h2>
      <div className="mt-3 flex max-w-[62ch] flex-col gap-3">{children}</div>
    </section>
  );
}

export function LegalList({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ul className="flex list-disc flex-col gap-2 pl-5">{children}</ul>;
}
