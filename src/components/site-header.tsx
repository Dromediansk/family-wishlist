import { Suspense } from "react";
import Link from "next/link";
import { GiftIcon, ShoppingBagIcon } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/access";
import { countNoticesFor, countPendingAccounts, getAccess } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

/**
 * The bar at the top of every page: the wordmark, and — for whoever is signed in
 * and approved — navigation and the account menu.
 *
 * The right-hand half renders nothing until there is an approved member to
 * render it for. /login has nobody yet, and /pending has somebody the rest of
 * the app is meant to treat as a stranger; that page carries its own sign-out
 * button instead.
 *
 * `getAccess` is memoised per render (see src/lib/queries.ts), so asking here
 * costs nothing on top of the page below asking the same question.
 */
export async function SiteHeader() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-lg font-semibold"
      >
        <GiftIcon className="text-primary size-5 shrink-0" />
        <span className="truncate">Rodinný zoznam želaní</span>
      </Link>
      {/*
       * The account half needs the session and a database round trip. Without a
       * boundary here that work sits in front of the whole document, holding
       * back the <head> and every route's loading.tsx skeleton. The fallback
       * reserves the avatar's box so nothing jumps when it arrives.
       */}
      <Suspense fallback={<div className="size-9 shrink-0" />}>
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

  const [pendingCount, noticeCount] = await Promise.all([
    // Only an admin has an approval queue, so only an admin pays for the count.
    canManage ? countPendingAccounts() : 0,
    // Everyone pays for this one — anybody can have a gift cancelled under
    // them, and finding out only when you next happen to open Čo kupujem is too
    // late to be worth building. It is a `head: true` count on an indexed
    // column, the same cost an admin already carries above.
    countNoticesFor(member.id),
  ]);

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="sm" asChild className="relative">
        <Link
          href="/buying"
          aria-label={
            noticeCount > 0
              ? `Čo kupujem, ${noticeCount} upozornení`
              : "Čo kupujem"
          }
        >
          <ShoppingBagIcon />
          <span className="hidden sm:inline">Čo kupujem</span>
          {noticeCount > 0 ? <CountBadge>{noticeCount}</CountBadge> : null}
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
