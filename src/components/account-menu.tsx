"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { FlagEn, FlagSk } from "@/components/flag-icons";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABELS, otherLocale, type Locale } from "@/i18n/config";
import { groupInPath } from "@/lib/groups";
import { cn, initial } from "@/lib/utils";
import { isGroupAdmin } from "@/lib/visibility";
import type { GroupRef } from "@/lib/types";

/** Links the menu item to the form below it, which lives outside the menu. */
const SIGN_OUT_FORM = "sign-out";

/** The same trick again, for the same reason. */
const SET_LOCALE_FORM = "set-locale";

/**
 * Takes a name and the viewer's own groups — never a member row and never
 * anything wish-shaped.
 *
 * Managing members is per group, so the entry appears only inside one, and only
 * where this viewer is its admin: being an admin elsewhere is not cover.
 */
export function AccountMenu({
  name,
  groups,
}: {
  name: string;
  groups: readonly GroupRef[];
}) {
  const current = groupInPath(usePathname(), groups);
  const t = useTranslations("account");
  const other = otherLocale(useLocale() as Locale);
  return (
    <>
      {/*
       * Outside the menu on purpose: Radix unmounts menu content on select, so a
       * form in there would be torn down mid-submit.
       */}
      <form action={signOut} id={SIGN_OUT_FORM} className="hidden" />
      <form
        action={setLocale.bind(null, other)}
        id={SET_LOCALE_FORM}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "rounded-full border text-lg font-semibold",
          )}
          aria-label={t("label", { name })}
        >
          {initial(name)}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {current && isGroupAdmin(current) ? (
            <DropdownMenuItem asChild>
              <Link href={`/g/${current.id}/family`}>
                <SettingsIcon />
                {t("manageGroup")}
              </Link>
            </DropdownMenuItem>
          ) : null}

          {/*
           * The label is written in the language it selects rather than in the
           * one on screen, so it can be read by somebody who opened this menu
           * precisely because they cannot read the rest of it.
           */}
          <DropdownMenuItem asChild>
            <button type="submit" form={SET_LOCALE_FORM}>
              {other === "en" ? <FlagEn /> : <FlagSk />}
              {LOCALE_LABELS[other]}
            </button>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <button type="submit" form={SIGN_OUT_FORM}>
              <LogOutIcon />
              {t("signOut")}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
