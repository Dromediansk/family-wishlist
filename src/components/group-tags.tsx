import { UsersRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GroupId } from "@/lib/ids";
import type { GroupRef } from "@/lib/types";
import { wishGroupTags } from "@/lib/visibility";

/**
 * Which of the viewer's groups a wish reaches, as badges. For the two lists
 * that span more than one group — the owner's own list and /buying — where
 * nothing else on the row says which group it belongs to.
 *
 * Nothing at all for somebody in a single group: every wish they can see is
 * there through it, so the badge would repeat itself on every row. The same
 * rule hides the picker in `wish-form.tsx`.
 *
 * `groupIds` is expected to be narrowed already — `src/lib/data/wishes.ts`
 * drops the tags naming a group their owner has left. Filtering `groups` here
 * is the second line of the same defence, not the first.
 * docs/content/ui-patterns.md#a-group-tag
 */
export function GroupTags({
  groupIds,
  groups,
}: {
  groupIds: readonly GroupId[];
  groups: readonly GroupRef[];
}) {
  if (groups.length < 2) return null;

  const tags = wishGroupTags(groupIds, groups);
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((group) => (
        <Badge
          key={group.id}
          variant="outline"
          title={`Viditeľné v skupine ${group.name}`}
        >
          <UsersRoundIcon aria-hidden />
          <span className="sr-only">Viditeľné v skupine</span>
          <span className="max-w-40 truncate">{group.name}</span>
        </Badge>
      ))}
    </div>
  );
}
