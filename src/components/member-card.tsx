import Link from "next/link";
import { GiftIcon, ShieldIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, wishCount } from "@/lib/utils";
import type { MemberSummary } from "@/lib/types";

/**
 * One family member, as a nameplate you tap to open their list.
 *
 * The name links to the list and its `after` pseudo-element stretches over the
 * whole card, so the tap target is the card itself — far easier to hit on a
 * phone than a small button. The bottom row ignores pointer events so it never
 * punches a dead hole in that target; only the button inside it takes clicks.
 *
 * `viewerIsOwner` says whose card this is, and drives both halves of what that
 * changes: "Pridať želanie" appears, since adding to someone else's list isn't
 * a thing, and the count drops its second number.
 *
 * That count otherwise leads with what is still free to reserve and keeps the
 * total behind it, muted: "2 / 5". Your own card shows the bare total — a
 * smaller number beside it would tell you the difference had been claimed, and
 * the type carries no such number to render.
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
            href={`/member/${member.id}`}
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
            // Tracks what is left to take, so a fully reserved list dims down.
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
