"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiftIcon } from "lucide-react";

import { groupIdFromPath } from "@/lib/groups";

/**
 * The app's name in the corner, which leads back to the grid of the group being
 * read — and to `/`, which picks the first group, on the screens that belong to
 * no one group.
 *
 * The id comes from the path, since the header renders above the segment that
 * names one. It is not checked against the viewer's groups because it needs no
 * checking: an id they are not in leads back to the same 404 it came from.
 */
export function HomeLink() {
  const groupId = groupIdFromPath(usePathname());

  return (
    <Link
      href={groupId ? `/g/${groupId}` : "/"}
      aria-label="Prajem si.."
      className="flex min-w-0 items-center"
    >
      <GiftIcon className="text-primary size-6 shrink-0" />
    </Link>
  );
}
