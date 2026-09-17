"use client";

import Link from "next/link";
import { Fragment, startTransition, useState } from "react";
import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { markActivitySeen } from "@/app/actions/activity";
import { GroupBadges } from "@/components/group-tags";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activityKey } from "@/lib/activity";
import type { ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What happened while the viewer was away. Every row is a label, a title and a
 * muted line of names — never a sentence, because Slovak past tense agrees with
 * gender and its prepositions govern case, and a name read from a column can be
 * neither inflected nor gendered.
 * docs/superpowers/specs/2026-09-16-activity-feed-design.md
 */

/** Past this the badge stops counting and starts meaning "a lot". */
const BADGE_MAX = 9;

function ActivityRow({ item, isNew }: { item: ActivityItem; isNew: boolean }) {
  const t = useTranslations("activity");

  switch (item.kind) {
    case "wish-added":
      return (
        <Row
          href={`/g/${item.group.id}/member/${item.owner.id}`}
          label={t("wishAdded")}
          title={item.title}
          detail={item.owner.name}
          groupNames={[item.group.name]}
          isNew={isNew}
        />
      );

    case "wish-claimed":
      return (
        <Row
          href={`/g/${item.group.id}/member/${item.owner.id}`}
          label={t("wishClaimed")}
          title={item.title}
          detail={
            item.claimer
              ? t("wishClaimedDetail", {
                  owner: item.owner.name,
                  claimer: item.claimer.name,
                })
              : t("wishClaimedDetailHidden", { owner: item.owner.name })
          }
          groupNames={[item.group.name]}
          isNew={isNew}
        />
      );

    case "wish-fulfilled":
      return (
        <Row
          href={item.viewerIsOwner ? "/received" : "/buying/history"}
          label={t("wishFulfilled")}
          title={item.title}
          detail={t("wishFulfilledDetail", {
            giver: item.giverName,
            owner: item.ownerName,
          })}
          groupNames={item.groupNames}
          isNew={isNew}
        />
      );

    case "member-joined":
      return (
        <Row
          href={`/g/${item.group.id}/family`}
          label={t("memberJoined")}
          title={item.member.name}
          groupNames={[item.group.name]}
          isNew={isNew}
        />
      );
  }
}

function Row({
  href,
  label,
  title,
  detail,
  groupNames,
  isNew,
}: {
  href: string;
  label: string;
  title: string;
  /** Absent where the title already carries the only name — a new member. */
  detail?: string;
  groupNames: readonly string[];
  isNew: boolean;
}) {
  const t = useTranslations("activity");

  return (
    <DropdownMenuItem asChild>
      <Link
        href={href}
        className={cn(
          "flex flex-col items-start gap-0.5 border-l-2",
          isNew ? "border-primary bg-accent/40" : "border-transparent",
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
          {/* The colour alone would say this to sighted readers only. */}
          {isNew ? <span className="sr-only">{t("unread")}</span> : null}
        </span>
        <span className="w-full truncate font-medium">{title}</span>
        {/* The names and the tag share a line, the tag pushed to its end, so
            the badges line up down the menu however long the names run. A
            handed-over gift may have kept no group names at all. */}
        <div className="flex w-full items-center gap-2">
          {detail ? (
            <span className="text-muted-foreground min-w-0 truncate text-sm">
              {detail}
            </span>
          ) : null}
          {groupNames.length > 0 ? (
            <div className="ml-auto flex justify-end">
              <GroupBadges names={groupNames} />
            </div>
          ) : null}
        </div>
      </Link>
    </DropdownMenuItem>
  );
}

export function ActivityBell({
  items,
  unseen,
}: {
  items: readonly ActivityItem[];
  unseen: number;
}) {
  const t = useTranslations("activity");

  /*
   * Frozen only while the dropdown is open, not for the life of the tab.
   * `ActivityBell` is mounted by the root layout, so a `revalidatePath` or a
   * live ping re-renders it into the running tree rather than replacing it —
   * the component keeps its identity across every such update. Reading
   * `unseen` straight from props would follow that re-render and take the
   * highlight away — or hand the wrong rows a highlight — while the reader was
   * still looking at it, since opening the bell immediately marks everything
   * seen. Capturing it at open time and releasing it at close time survives
   * exactly the updates that land underneath an open menu, without ever going
   * stale: the next open always captures the current `unseen` afresh. The list
   * is newest-first, so the first this-many rows are the ones they came for.
   */
  const [frozen, setFrozen] = useState<number | null>(null);
  const newCount = frozen ?? unseen;

  /*
   * On open rather than on close: clicking a row navigates away and unmounts
   * the menu, so a close handler may never fire and the badge would stay lit.
   * The result is deliberately unread — a failed mark costs a badge that
   * clears next time.
   */
  const onOpenChange = (open: boolean) => {
    if (!open) {
      setFrozen(null);
      return;
    }
    setFrozen(unseen); // captured before markActivitySeen revalidates
    if (unseen === 0) return;
    startTransition(() => {
      void markActivitySeen();
    });
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative rounded-full",
        )}
        aria-label={unseen > 0 ? t("labelUnseen", { count: unseen }) : t("label")}
      >
        <BellIcon />
        {unseen > 0 ? (
          <span
            aria-hidden
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 min-w-5 rounded-full px-1 text-xs font-semibold leading-5"
          >
            {unseen > BADGE_MAX ? `${BADGE_MAX}+` : unseen}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-96 w-80 overflow-y-auto">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-sm">{t("empty")}</p>
        ) : (
          items.map((item, index) => (
            <Fragment key={activityKey(item)}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <ActivityRow item={item} isNew={index < newCount} />
            </Fragment>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
