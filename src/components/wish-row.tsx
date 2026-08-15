import { ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OwnerWish } from "@/lib/types";

/**
 * The wish itself — title, optional description, optional link. Claim status is
 * never rendered here; the caller decides what, if anything, to put in `action`.
 */
export function WishRow({
  wish,
  action,
  dimmed = false,
}: {
  wish: OwnerWish;
  action?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        dimmed && "opacity-60",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium break-words">{wish.title}</p>
        {wish.description ? (
          <p className="text-muted-foreground text-sm break-words whitespace-pre-line">
            {wish.description}
          </p>
        ) : null}
        {wish.url ? (
          <a
            href={wish.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm underline underline-offset-4"
          >
            <ExternalLinkIcon className="size-3.5" />
            <span className="break-all">{displayUrl(wish.url)}</span>
          </a>
        ) : null}
      </div>
      {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
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
