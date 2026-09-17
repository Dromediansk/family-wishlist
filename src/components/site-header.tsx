import { Suspense } from "react";

import { AccountMenu } from "@/components/account-menu";
import { ActivityBell } from "@/components/activity-bell";
import { HomeLink } from "@/components/home-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { StickyHeader } from "@/components/sticky-header";
import { getAccess, getAccountName } from "@/lib/data/access";
import { getActivity } from "@/lib/data/activity";
import { countGroupsCreatedBy } from "@/lib/data/groups";
import { getPeerNames } from "@/lib/data/members";
import { MAX_GROUPS_PER_ACCOUNT } from "@/lib/groups";
import { isConfigured } from "@/lib/supabase";
import type { Viewer } from "@/lib/types";

/**
 * The bar at the top of every page. Mounted by the root layout, so a stranger
 * wears it too — that is what puts the language switch within reach of somebody
 * who has not signed in yet. docs/decisions/ui-patterns.md#layout-contract
 *
 * The right-hand half is the language switch alone for a stranger, and cut down
 * to the account menu for somebody with no group yet: nothing to switch between,
 * but still an account to sign out of. `getAccess` is memoised per render, so
 * asking here costs nothing.
 *
 * `StickyHeader` owns the element so that this can stay a Server Component and
 * the account half below can keep streaming in behind its own boundary.
 */
export async function SiteHeader() {
  return (
    <StickyHeader>
      <HomeLink />
      {/*
       * Without this boundary the account half's round trip sits in front of the
       * whole document. The fallback reserves the tallest thing that can resolve
       * there — the avatar, for the signed-in majority of renders.
       */}
      <Suspense fallback={<div className="size-11 shrink-0" />}>
        <HeaderRight />
      </Suspense>
    </StickyHeader>
  );
}

async function HeaderRight() {
  // Without configuration there is no database to ask — getSupabase() throws.
  // The language still belongs to this browser, so that control stays.
  if (!isConfigured()) return <LocaleSwitcher />;

  const access = await getAccess();
  // The one control that is a stranger's to use before they sign in.
  if (access.kind === "anonymous") return <LocaleSwitcher />;

  const viewer = access.viewer;

  /*
   * No group means no per-group label to wear and nothing to switch between —
   * but the menu itself has to be here. It is the only way off `/start`, and an
   * account that cannot sign out is stuck.
   *
   * Two name sources because a groupless account has no per-group label at all:
   * `getPeerNames` reads memberships and hands back nothing for them, so the
   * seed name is the only one there is.
   */
  const groupless = access.kind === "groupless";

  /*
   * The header spans every group, so the avatar wears the account-level name —
   * `preferredName`'s default, the label from whichever group the viewer joined
   * first. Nothing here works out which group is current: the one control that
   * names one is the group's own title, inside the segment that proves it.
   *
   * The cap is counted for a groupless account too. They are the likeliest
   * person to press *Vytvoriť skupinu*, and an account that has created five
   * and left them all has spent the budget all the same.
   */
  const [name, created] = await Promise.all([
    groupless
      ? getAccountName(viewer)
      : getPeerNames(viewer).then((names) => names.get(viewer.userId) ?? "?"),
    countGroupsCreatedBy(viewer),
  ]);

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {groupless ? null : (
        /*
         * Its own boundary: `getActivity`'s four reads must not make the avatar
         * beside it wait on the feed. The fallback is the bell's own footprint,
         * so nothing shifts when it resolves.
         */
        <Suspense fallback={<div className="size-11 shrink-0" />}>
          <ActivityBellSection viewer={viewer} />
        </Suspense>
      )}
      <AccountMenu
        name={name}
        groups={viewer.groups}
        canCreate={created < MAX_GROUPS_PER_ACCOUNT}
      />
    </div>
  );
}

/** Isolates `getActivity`'s round trip behind its own Suspense boundary. */
async function ActivityBellSection({ viewer }: { viewer: Viewer }) {
  const activity = await getActivity(viewer);
  return <ActivityBell items={activity.items} unseen={activity.unseen} />;
}
