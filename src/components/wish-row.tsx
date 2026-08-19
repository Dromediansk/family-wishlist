import { ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Displayable } from "@/lib/types";
import { wishPhotoUrl } from "@/lib/wishes";

/**
 * The wish itself — optional photo, title, optional description, optional link.
 * Claim status is never rendered here; the caller decides what, if anything, to
 * put in `action`.
 */
export function WishRow({
  wish,
  action,
  dimmed = false,
}: {
  wish: Displayable;
  action?: React.ReactNode;
  dimmed?: boolean;
}) {
  const photo = wishPhotoUrl(wish);

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
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {photo ? (
            /*
             * A thumbnail is too small to read a screenshot in, so it opens the
             * full picture the same way the link beneath it opens a shop.
             */
            <a
              href={photo}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
              aria-label={`Zobraziť fotku: ${wish.title}`}
            >
              {/*
               * A plain <img>, as in the photo field: the optimizer would fetch
               * /wish-photo server-side, without the visitor's session, and be
               * answered with a 404, so there is nothing for it to do.
               */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                loading="lazy"
                className="size-24 rounded-lg border object-cover"
              />
            </a>
          ) : null}
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
