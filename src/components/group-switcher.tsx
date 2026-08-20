"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupInPath } from "@/lib/groups";
import { cn } from "@/lib/utils";
import type { GroupRef } from "@/lib/types";

/**
 * Moves between the viewer's groups, and out to `/start` for a new one.
 *
 * Both bottom entries lead to `/start`, which is what keeps group creation
 * reachable at all: `/` only sends a *groupless* account there.
 *
 * Which group is current comes from the path, because the header is rendered by
 * `(app)/layout.tsx`, above the segment that names one.
 */
export function GroupSwitcher({
  groups,
  canCreate,
}: {
  groups: readonly GroupRef[];
  canCreate: boolean;
}) {
  const pathname = usePathname();
  const current = groupInPath(pathname, groups);

  // Nothing to switch between and nothing to add: the whole control would be a
  // button that says where you already are.
  if (groups.length < 2 && !canCreate) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "min-w-0",
        )}
        aria-label={current ? `Skupina – ${current.name}` : "Skupiny"}
      >
        <UsersRoundIcon />
        <span className="hidden max-w-40 truncate sm:inline">
          {current ? current.name : "Skupiny"}
        </span>
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Skupiny</DropdownMenuLabel>

        {groups.map((group) => (
          <DropdownMenuItem key={group.id} asChild>
            <Link href={`/g/${group.id}`}>
              {group.id === current?.id ? (
                <CheckIcon />
              ) : (
                // Holds the tick's column, so the names line up either way.
                <span className="size-5" aria-hidden />
              )}
              <span className="truncate">{group.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/start">
            <PlusIcon />
            Vytvoriť skupinu
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/start">
            <UserPlusIcon />
            Pridať sa do skupiny
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
