import Link from "next/link";
import { GiftIcon, ShieldIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, wishCount } from "@/lib/utils";
import type { MemberSummary } from "@/lib/types";

/**
 * One family member, as a nameplate you tap to open their list. The name's
 * `after` pseudo-element stretches over the whole card, so the tap target is the
 * card; the bottom row ignores pointer events so it punches no dead hole in it.
 *
 * `viewerIsOwner` adds "Pridať želanie" and drops the count's second number —
 * docs/content/privacy-rule.md#counting-on-the-family-grid.
 */
export function MemberCard({ member }: { member: MemberSummary }) {
  // An empty list reads better as a lone "0" than as "0 / 0".
  const available =
    member.viewerIsOwner || member.wishCount === 0
      ? null
      : member.availableCount;
  const leadCount = available ?? member.wishCount;

  return (
    <Card className="hover:border-ring/60 hover:bg-accent/20 active:bg-accent/30 relative min-h-44 gap-4 p-5 transition">
      {member.role === "admin" ? (
        <Badge
          variant="secondary"
          title="Môže spravovať členov rodiny"
          className="pointer-events-none absolute top-3 right-3"
        >
          <ShieldIcon />
          správca
        </Badge>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <h2 className="text-3xl leading-tight font-semibold text-balance wrap-break-word">
          <Link
            href={`/member/${member.userId}`}
            className="rounded-sm after:absolute after:inset-0"
          >
            {member.name}
          </Link>
        </h2>
      </div>

      <div className="pointer-events-none relative flex items-center gap-2">
        {member.viewerIsOwner ? (
          <AddWishDialog className="pointer-events-auto" />
        ) : null}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums",
            // A fully reserved list dims down.
            leadCount > 0 ? "text-primary" : "text-muted-foreground",
          )}
        >
          <GiftIcon className="size-5" aria-hidden />
          <span aria-hidden>
            {leadCount}
            {available !== null ? (
              <span className="text-muted-foreground">{` / ${member.wishCount}`}</span>
            ) : null}
          </span>
          <span className="sr-only">
            {available !== null ? `${available} / ` : null}
            {wishCount(member.wishCount)}
          </span>
        </span>
      </div>
    </Card>
  );
}
