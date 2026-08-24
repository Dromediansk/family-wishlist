import { LEGAL_DETAILS, type LegalDetail } from "@/lib/legal";

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
export function Detail({ of }: Readonly<{ of: LegalDetail }>) {
  if (of.value.trim() === "") {
    return (
      <span className="bg-destructive/15 text-destructive rounded px-1 font-medium">
        [DOPLNIŤ: {of.hint}]
      </span>
    );
  }
  return of.value;
}

/** A literal the reader may have to match character for character — a cookie
 *  name, an OAuth scope. Tailwind's preflight already makes `code` monospace at
 *  1em; this only gives it a surface to sit on. */
export function Code({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <code className="bg-secondary rounded px-1 py-0.5 text-sm">{children}</code>
  );
}

export function LegalPage({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <article>
      {/* No header renders above these pages, so this is the only heading. */}
      <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Účinné od <Detail of={LEGAL_DETAILS.effectiveFrom} />
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
