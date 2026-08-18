import { Suspense } from "react";
import Link from "next/link";
import { GiftIcon, ShoppingBagIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/access";
import { countPendingAccounts, getAccess } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

/**
 * The bar at the top of every signed-in page: the wordmark, and — for whoever is
 * approved — navigation and the account menu.
 *
 * Mounted by `src/app/(app)/layout.tsx`, not the root layout. That is the whole
 * reason the route group exists: `/login` and the 404 sit outside it and render
 * without a header, so this component is never asked to be chrome for a stranger.
 *
 * The right-hand half still renders nothing until there is an approved member to
 * render it for, because two cases remain. /pending has somebody the rest of the
 * app is meant to treat as a stranger; that page carries its own sign-out button
 * instead. And a page's `redirect()` for an anonymous visitor races this layout,
 * which can observe `anonymous` before the redirect lands.
 *
 * `getAccess` is memoised per render (see src/lib/queries.ts), so asking here
 * costs nothing on top of the page below asking the same question.
 */
export async function SiteHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link
        href="/"
        // A step smaller on phones: at 24px the full Slovak name would truncate
        // next to the taller avatar, and a clipped wordmark reads as a bug.
        className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl"
      >
        <GiftIcon className="text-primary size-6 shrink-0" />
        <span className="truncate">Rodinný zoznam želaní</span>
      </Link>
      {/*
       * The account half needs the session and a database round trip. Without a
       * boundary here that work sits in front of the whole document, holding
       * back the <head> and every route's loading.tsx skeleton. The fallback
       * reserves the avatar's box so nothing jumps when it arrives.
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
