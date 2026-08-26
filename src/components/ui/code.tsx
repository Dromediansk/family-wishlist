/**
 * A literal the reader may have to match character for character — a cookie
 * name, an OAuth scope, a file the operator has to create. Tailwind's preflight
 * already makes `code` monospace at 1em; this only gives it a surface to sit on.
 *
 * Here rather than beside the one page that first needed it, because "what a
 * translated message may wrap in `<code>`" is a property of the catalogue: a
 * `<code>` span has to look the same whichever namespace it came from.
 */
export function Code({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <code className="bg-secondary rounded px-1 py-0.5 text-sm">{children}</code>
  );
}
