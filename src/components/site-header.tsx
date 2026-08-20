import { Suspense } from "react";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { GroupSwitcher } from "@/components/group-switcher";
import { HomeLink } from "@/components/home-link";
import { Button } from "@/components/ui/button";
import { getAccess, getAccountName } from "@/lib/data/access";
import { countGroupsCreatedBy } from "@/lib/data/groups";
import { getPeerNames } from "@/lib/data/members";
import { MAX_GROUPS_PER_ACCOUNT } from "@/lib/groups";
import { isConfigured } from "@/lib/supabase";

/**
 * The bar at the top of every signed-in page. Mounted by `(app)/layout.tsx`, so
 * `/login` and the 404 never get it.
 *
 * The right-hand half is empty for a stranger, and cut down to the account menu
 * for somebody with no group yet: nothing to switch between, but still an account
 * to sign out of. `getAccess` is memoised per render, so asking here costs
 * nothing.
 */
export async function SiteHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <HomeLink />
      {/*
       * Without this boundary the account half's round trip sits in front of the
       * whole document. The fallback reserves the avatar's box.
       */}
      <Suspense fallback={<div className="size-11 shrink-0" />}>
        <HeaderAccount />
      </Suspense>
    </header>
  );
}

async function HeaderAccount() {
  // Without configuration there is no database to ask — getSupabase() throws.
  if (!isConfigured()) return null;

  const access = await getAccess();
  if (access.kind === "anonymous") return null;

  const viewer = access.viewer;

  /*
   * No group means no per-group label to wear, nothing to switch between and no
   * group-scoped entry to offer — but the menu itself has to be here. It is the
   * only way off `/start`, and an account that cannot sign out is stuck.
   *
   * Two name sources because a groupless account has no per-group label at all:
   * `getPeerNames` reads memberships and hands back nothing for them, so the
   * seed name is the only one there is.
   */
  const groupless = access.kind === "groupless";

  /*
   * The header spans every group, so the avatar wears the account-level name —
   * `preferredName`'s default, the label from whichever group the viewer joined
   * first. The two controls beside it work out which group is current from the
   * path, which this Server Component cannot see.
   */
  const [name, created] = await Promise.all([
    groupless
      ? getAccountName(viewer)
      : getPeerNames(viewer).then((names) => names.get(viewer.userId) ?? "?"),
    groupless ? 0 : countGroupsCreatedBy(viewer),
  ]);

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {groupless ? null : (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/buying" aria-label="Čo kupujem">
              <ShoppingBagIcon />
              <span className="hidden sm:inline">Čo kupujem</span>
            </Link>
          </Button>
          <GroupSwitcher
            groups={viewer.groups}
            canCreate={created < MAX_GROUPS_PER_ACCOUNT}
          />
        </>
      )}
      <AccountMenu name={name} groups={viewer.groups} />
    </div>
  );
}
