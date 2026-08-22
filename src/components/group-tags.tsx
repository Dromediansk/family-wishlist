import { UsersRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { groupsWorthNaming } from "@/lib/groups";
import type { GroupId } from "@/lib/ids";
import type { GroupRef } from "@/lib/types";
import { wishGroupTags } from "@/lib/visibility";

/**
 * Which of the viewer's groups a wish reaches, as badges.
 * docs/content/ui-patterns.md#a-group-tag
 *
 * `groupIds` is expected to be narrowed already — `src/lib/data/wishes.ts`
 * drops the tags naming a group their owner has left. Filtering `groups` here
 * resolves the ids to names; it is not a second guard.
 */
export function GroupTags({
  groupIds,
  groups,
}: {
  groupIds: readonly GroupId[];
  groups: readonly GroupRef[];
}) {
  if (!groupsWorthNaming(groups)) return null;

  const tags = wishGroupTags(groupIds, groups);
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((group) => (
        // `title` carries the name the truncation can hide, nothing more.
        <Badge key={group.id} variant="outline" title={group.name}>
          <UsersRoundIcon aria-hidden />
          <span className="sr-only">Viditeľné v skupine</span>
          <span className="max-w-40 truncate">{group.name}</span>
        </Badge>
      ))}
    </div>
  );
}
