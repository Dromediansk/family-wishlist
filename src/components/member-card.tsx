import Link from "next/link";
import { ListIcon, ShieldIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { wishCount } from "@/lib/utils";
import type { MemberWithCount } from "@/lib/types";

/**
 * One family member.
 *
 * "Pridať želanie" only appears on your own card — adding to someone else's
 * list isn't a thing — and "Vybrať zo zoznamu" only on everyone else's.
 */
export function MemberCard({
  member,
  isCurrentMember,
}: {
  member: MemberWithCount;
  isCurrentMember: boolean;
}) {
  return (
    <Card className="justify-between gap-5">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg leading-tight font-semibold break-words">
            {member.name}
          </h2>
          {member.role === "admin" ? (
            <Badge variant="secondary" title="Môže spravovať členov rodiny">
              <ShieldIcon />
              správca
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {isCurrentMember ? "To si ty · " : null}
          {member.wishCount === 0
            ? "Zatiaľ žiadne želania"
            : wishCount(member.wishCount)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {isCurrentMember ? (
          <>
            <AddWishDialog />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/member/${member.id}`}>
                <ListIcon />
                Môj zoznam
              </Link>
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/member/${member.id}`}>
              <ListIcon />
              Vybrať zo zoznamu
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
