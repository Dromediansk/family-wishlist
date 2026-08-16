import { ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Displayable } from "@/lib/types";

/**
 * The wish itself — title, optional description, optional link. Claim status is
 * never rendered here; the caller decides what, if anything, to put in `action`
 * and `footer`.
 */
export function WishRow({
  wish,
  action,
  footer,
  dimmed = false,
}: {
  wish: Displayable;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <li className="border-b py-5 last:border-b-0">
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
          // 70, not 60: still reads as "taken, move on", but the title stays
          // legible to an older eye rather than dissolving into the paper.
          dimmed && "opacity-70",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <p className="text-lg leading-snug font-semibold break-words">
            {wish.title}
          </p>
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
        {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
      </div>
      {footer}
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
