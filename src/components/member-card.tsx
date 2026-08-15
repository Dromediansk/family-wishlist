import Link from "next/link";
import { GiftIcon, ShieldIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, wishCount } from "@/lib/utils";
import type { MemberWithCount } from "@/lib/types";

/**
 * One family member, as a nameplate you tap to open their list.
 *
 * The name links to the list and its `after` pseudo-element stretches over the
 * whole card, so the tap target is the card itself — far easier to hit on a
 * phone than a small button. The bottom row ignores pointer events so it never
 * punches a dead hole in that target; only the button inside it takes clicks.
 *
 * "Pridať želanie" only appears on your own card — adding to someone else's
 * list isn't a thing.
 */
export function MemberCard({
  member,
  isCurrentMember,
}: {
  member: MemberWithCount;
  isCurrentMember: boolean;
}) {
  const hasWishes = member.wishCount > 0;

  return (
    <Card className="hover:border-ring/60 hover:bg-accent/20 active:bg-accent/30 relative min-h-40 gap-4 p-5 transition">
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

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance break-words">
          <Link
            href={`/member/${member.id}`}
            className="rounded-sm after:absolute after:inset-0"
          >
            {member.name}
          </Link>
        </h2>
      </div>

      <div className="pointer-events-none relative flex items-center gap-2">
        {isCurrentMember ? (
          <AddWishDialog className="pointer-events-auto" />
        ) : null}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-sm font-medium tabular-nums",
            hasWishes ? "text-primary" : "text-muted-foreground",
          )}
        >
          <GiftIcon className="size-4" aria-hidden />
          <span aria-hidden>{member.wishCount}</span>
          <span className="sr-only">{wishCount(member.wishCount)}</span>
        </span>
      </div>
    </Card>
  );
}
