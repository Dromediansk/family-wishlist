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

  return <GroupBadges names={tags.map((group) => group.name)} />;
}

/**
 * The same badges for a handed-over gift, read off the record's own snapshot.
 *
 * A history row holds names and no ids, deliberately — the record must outlive
 * the groups it names — so there is nothing for `wishGroupTags` to resolve
 * against. `fulfil_wish` narrowed the set at handover instead, to the groups
 * both parties stood in then. docs/content/history.md
 *
 * `groups` is read for its length alone, and it is the viewer's groups *now*:
 * somebody who is in one group should not meet their first badge here.
 */
export function ArchivedGroupTags({
  names,
  groups,
}: {
  names: readonly string[];
  groups: readonly GroupRef[];
}) {
  if (!groupsWorthNaming(groups)) return null;
  if (names.length === 0) return null;

  return <GroupBadges names={names} />;
}

/**
 * One badge per group. Shared so the live tags and the archived ones cannot
 * drift apart, and keyed by index because a name is not unique — two groups may
 * share one, and a snapshot has no id to fall back on.
 */
function GroupBadges({ names }: { names: readonly string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {names.map((name, index) => (
        // `title` carries the name the truncation can hide, nothing more.
        <Badge key={`${name}-${index}`} variant="outline" title={name}>
          <UsersRoundIcon aria-hidden />
          <span className="sr-only">Viditeľné v skupine</span>
          <span className="max-w-40 truncate">{name}</span>
        </Badge>
      ))}
    </div>
  );
}
