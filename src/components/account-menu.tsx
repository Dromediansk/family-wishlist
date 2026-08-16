"use client";

import Link from "next/link";
import { LogOutIcon, SettingsIcon } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Badge, CountBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initial } from "@/lib/utils";

/** Links the menu item to the form below it, which lives outside the menu. */
const SIGN_OUT_FORM = "sign-out";

/**
 * The account chrome, in the header on every page a signed-in member sees.
 *
 * Takes only a name, a role flag and a count — never a member row and never
 * anything wish-shaped. The one rule of this app is about what an owner can
 * learn from their own list, and the header stays well clear of it.
 *
 * `isAdmin` is not derivable from `pendingCount`: an admin with an empty queue
 * still needs the link to /family.
 */
export function AccountMenu({
  name,
  isAdmin,
  pendingCount,
}: {
  name: string;
  isAdmin: boolean;
  pendingCount: number;
}) {
  // The header only counts for admins, so a count above zero implies one.
  const waiting = pendingCount > 0;

  return (
    <>
      {/*
       * Outside the menu on purpose. Radix portals the menu content and unmounts
       * it on select, so a form in there would be torn down mid-submit; here the
       * browser owns the post and the item below just points at it. Same
       * server action, same one way to sign out, as sign-out-button.tsx.
       */}
      <form action={signOut} id={SIGN_OUT_FORM} className="hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "relative rounded-full border font-semibold",
          )}
          aria-label={`Účet – ${name}${waiting ? `, ${pendingCount} čaká na schválenie` : ""}`}
        >
          {initial(name)}
          {waiting ? <CountBadge>{pendingCount}</CountBadge> : null}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/family">
                <SettingsIcon />
                Spravovať rodinu
                {waiting ? (
                  <Badge className="ml-auto px-1.5 py-0">{pendingCount}</Badge>
                ) : null}
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <button type="submit" form={SIGN_OUT_FORM}>
              <LogOutIcon />
              Odhlásiť sa
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
