import { Suspense } from "react";
import Link from "next/link";
import { GiftIcon, ShoppingBagIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/access";
import { countPendingAccounts, getAccess } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

/**
 * The bar at the top of every signed-in page. Mounted by `(app)/layout.tsx`, so
 * `/login` and the 404 never get it.
 *
 * The right-hand half renders nothing without an approved member: /pending
 * carries its own sign-out button, and a page's `redirect()` for an anonymous
 * visitor races this layout. `getAccess` is memoised per render, so asking here
 * costs nothing.
 */
export async function SiteHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link
        href="/"
        // A step smaller on phones, or the full Slovak name truncates.
        className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl"
      >
        <GiftIcon className="text-primary size-6 shrink-0" />
        <span className="truncate">Rodinný zoznam želaní</span>
      </Link>
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
  if (access.kind !== "active") return null;

  const member = access.member;
  const canManage = isAdmin(member);

  // Only an admin has an approval queue, so only an admin pays for the count.
  const pendingCount = canManage ? await countPendingAccounts() : 0;

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/buying" aria-label="Čo kupujem">
          <ShoppingBagIcon />
          <span className="hidden sm:inline">Čo kupujem</span>
        </Link>
      </Button>
      <AccountMenu
        name={member.name}
        isAdmin={canManage}
        pendingCount={pendingCount}
      />
    </div>
  );
}
