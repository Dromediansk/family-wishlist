/**
 * The illustrations on the landing page.
 *
 * They are built from the app's own components — `Card`, `WishRow`, `Badge`,
 * the button classes — with fake rows, rather than from screenshots. Two
 * languages and two themes would be four sets of images to recapture on every
 * change, and a list captured at desktop width and scaled to a phone is
 * unreadable, which is the one reader this app exists for.
 *
 * What that buys: the card and `WishRow`'s own interior — the title, the
 * description, the link — can drift in *data*, never in *structure*, because
 * they are the same components the real list uses. The fake action is a
 * stand-in for the real app's chrome, not the chrome itself, and can drift
 * from it like any other piece of UI.
 *
 * Nothing in here may be focusable. A screenshot's buttons are not controls,
 * and a tab stop that does nothing is worse than no tab stop.
 */

import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The panel a fake screen sits on — the app's own `Card`, overridden the same
 * way `WishListSkeleton` overrides it, so the illustration cannot drift from
 * the real list's surface. `shadow-lg` rather than the real list's `shadow-sm`
 * is the one deliberate difference: these float over the page.
 */
export function MockCard({
  caption,
  className,
  children,
}: Readonly<{
  caption: string;
  className?: string;
  children?: React.ReactNode;
}>) {
  return (
    <Card className={cn("gap-0 p-4 shadow-lg sm:p-5", className)}>
      <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
        {caption}
      </p>
      {children}
    </Card>
  );
}

/**
 * The reservation, drawn the same way in every illustration that shows one.
 * Shared so beat two and beat three cannot come to disagree about what a
 * reservation looks like — that they show the same badge is the page's own
 * argument.
 */
export async function MockClaimedBadge({
  vanishing = false,
}: Readonly<{
  /** The hero's badge fades out. It ends invisible in both the animated and
      the still case — announcing who reserved it on the owner's own list is
      precisely what this illustration exists to say never happens. */
  vanishing?: boolean;
}>) {
  const t = await getTranslations("landing.mock");
  const tWishes = await getTranslations("wishes");

  return (
    <Badge
      variant="accent"
      aria-hidden={vanishing}
      className={cn(vanishing && "landing-vanish")}
    >
      {tWishes("claimedBy", { name: t("claimerName") })}
    </Badge>
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
