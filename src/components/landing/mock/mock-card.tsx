import { cn } from "@/lib/utils";

/**
 * The illustrations on the landing page.
 *
 * They are built from the app's own components — `WishRow`, `Badge`, the button
 * classes — with fake rows, rather than from screenshots. Two languages and two
 * themes would be four sets of images to recapture on every change, and a list
 * captured at desktop width and scaled to a phone is unreadable, which is the
 * one reader this app exists for.
 *
 * What that buys: these can drift in *data*, never in *structure*. Restyle
 * `WishRow` and the landing page restyles with it.
 *
 * Nothing in here may be focusable. A screenshot's buttons are not controls,
 * and a tab stop that does nothing is worse than no tab stop.
 */

/** The white panel a fake screen sits on. */
export function MockCard({
  caption,
  className,
  children,
}: Readonly<{
  caption?: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-xl border p-4 shadow-lg sm:p-5",
        className,
      )}
    >
      {caption ? (
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          {caption}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * An illustration and the sentence that stands in for it.
 *
 * Without the caption a screen reader gets a stream of orphan list items with
 * no hint that they are a picture of the app rather than the reader's own list.
 */
export function MockFigure({
  caption,
  className,
  children,
}: Readonly<{
  caption: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <figure className={className}>
      {children}
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
