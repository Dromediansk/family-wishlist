import { ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Displayable } from "@/lib/types";
import { WishPhotoDialog } from "@/components/wish-photo-dialog";
import { wishPhotoUrl } from "@/lib/wishes";

/**
 * The wish itself — optional photo, title, optional description, optional link.
 * Claim status is never rendered here; the caller decides what, if anything, to
 * put in `action` and `tags`.
 *
 * Group tags sit under the title rather than below the content: a description
 * runs to 62ch over any number of lines and the link is a 44px target, so a tag
 * after them lands at an unpredictable height and stops being scannable down a
 * list. docs/content/ui-patterns.md#a-group-tag
 */
export function WishRow({
  wish,
  action,
  tags,
  actionBeside = false,
  dimmed = false,
}: {
  wish: Displayable;
  action?: React.ReactNode;
  /**
   * Group tags, on the two lists that span more than one group. A slot rather
   * than a field on `wish`, so `Displayable` stays as narrow as it is on
   * purpose — the row still cannot reach claim state.
   */
  tags?: React.ReactNode;
  /**
   * Keep `action` beside the wish on a phone too. Two lines of small text fit
   * there; buttons do not, so they keep the default full-width row of their own.
   */
  actionBeside?: boolean;
  dimmed?: boolean;
}) {
  const photo = wishPhotoUrl(wish);

  return (
    <li className="border-b py-5 last:border-b-0">
      <div
        className={cn(
          "flex gap-3 sm:gap-6",
          actionBeside
            ? "items-start justify-between"
            : "flex-col sm:flex-row sm:items-start sm:justify-between",
          // 70, not 60: still reads as "taken, move on", but the title stays
          // legible to an older eye rather than dissolving into the paper.
          dimmed && "opacity-70",
        )}
      >
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {photo ? (
            /*
             * A thumbnail is too small to read a screenshot in, so it opens the
             * full picture — in a dialog, so that closing it is one button and
             * not a hunt for the browser's back.
             */
            <WishPhotoDialog src={photo} title={wish.title} />
          ) : null}
          <div className="min-w-0 space-y-1.5">
            <p className="text-lg leading-snug font-semibold break-words">
              {wish.title}
            </p>
            {/* Bare, no wrapper: `GroupTags` renders nothing for a viewer with
                one group, and a wrapper would leave that nothing a row of
                `space-y-1.5` above the description. */}
            {tags}
            {wish.description ? (
              <p className="text-muted-foreground max-w-[62ch] break-words whitespace-pre-line">
                {wish.description}
              </p>
            ) : null}
            {wish.url ? (
              <a
                href={wish.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4"
              >
                <ExternalLinkIcon className="size-4 shrink-0" />
                <span className="break-all">{displayUrl(wish.url)}</span>
              </a>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
      </div>
    </li>
  );
}

function displayUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
