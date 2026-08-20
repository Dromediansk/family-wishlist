"use client";

import Link from "next/link";
import { LogOutIcon, SettingsIcon } from "lucide-react";

import { signOut } from "@/app/actions/auth";
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
 * Takes a name and a role flag — never a member row and never anything
 * wish-shaped.
 */
export function AccountMenu({
  name,
  isAdmin,
}: {
  name: string;
  isAdmin: boolean;
}) {
  return (
    <>
      {/*
       * Outside the menu on purpose: Radix unmounts menu content on select, so a
       * form in there would be torn down mid-submit.
       */}
      <form action={signOut} id={SIGN_OUT_FORM} className="hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "rounded-full border text-lg font-semibold",
          )}
          aria-label={`Účet – ${name}`}
        >
          {initial(name)}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/family">
                <SettingsIcon />
                Spravovať rodinu
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
