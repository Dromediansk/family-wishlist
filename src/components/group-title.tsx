"use client";

import Link from "next/link";
import { CheckIcon, ChevronDownIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupTitleHasMenu } from "@/lib/groups";
import type { GroupId } from "@/lib/ids";
import { cn } from "@/lib/utils";
import type { GroupRef } from "@/lib/types";

/** The heading's own look, worn whether or not it opens anything. */
const HEADING = "min-w-0 text-2xl font-semibold text-balance break-words";

/**
 * The group's name, and the way to every other one — the switcher, worn by the
 * title of the group it names rather than by a glyph in the header.
 * docs/decisions/ui-patterns.md#the-group-title-is-the-switcher
 *
 * Which group is current arrives as a prop, not read off the path: unlike the
 * header this renders *inside* the segment that names one, so the page has
 * already proved the membership and there is nothing left to work out.
 *
 * `Spravovať skupinu` is here and not in the account menu because it is about
 * one group, and this is the only control that names one. A hidden menu item is
 * not a guard all the same — the page behind it re-checks.
 * docs/decisions/groups-and-invites.md#roles-are-per-group
 */
export function GroupTitle({
  groups,
  currentId,
  name,
  canManage,
}: {
  groups: readonly GroupRef[];
  currentId: GroupId;
  name: string;
  canManage: boolean;
}) {
  const t = useTranslations("groups.switcher");
  const account = useTranslations("account");

  if (!groupTitleHasMenu(groups, canManage)) {
    return <h1 className={HEADING}>{name}</h1>;
  }

  return (
    <DropdownMenu>
      {/*
       * The trigger sits inside the `h1` rather than replacing it: the group's
       * name is the page's heading first, and a button in its place would take
       * the page out of the outline a screen reader navigates by.
       */}
      <h1 className={cn(HEADING, "-mx-2")}>
        <DropdownMenuTrigger
          className={cn(
            "hover:bg-secondary inline-flex max-w-full items-center gap-1.5 rounded-lg text-left transition-colors",
            // The padding gives the tap somewhere to land; the heading's own
            // `-mx-2` keeps it outside the text column, so the name stays
            // optically flush with the paragraph below. That pull cannot sit
            // here: it would narrow the heading the trigger shrinks to fit,
            // and `max-w-full` measures against that — wrapping a name that
            // had 1rem of room to spare.
            "-my-1 cursor-pointer px-2 py-1",
          )}
          aria-label={t("current", { name })}
        >
          <span className="min-w-0 break-words">{name}</span>
          <ChevronDownIcon className="size-6 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
      </h1>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t("heading")}</DropdownMenuLabel>

        {groups.map((group) => (
          <DropdownMenuItem key={group.id} asChild>
            <Link href={`/g/${group.id}`}>
              {group.id === currentId ? (
                <CheckIcon />
              ) : (
                // Holds the tick's column, so the names line up either way.
                <span className="size-5" aria-hidden />
              )}
              <span className="truncate">{group.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/g/${currentId}/family`}>
                <SettingsIcon />
                {account("manageGroup")}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
