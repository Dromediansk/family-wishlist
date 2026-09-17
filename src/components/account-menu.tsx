"use client";

import Link from "next/link";
import { LogOutIcon, PlusIcon, ShoppingBagIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { signOut } from "@/app/actions/auth";
import { setLocale } from "@/app/actions/locale";
import { LOCALE_FLAGS } from "@/components/flag-icons";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABELS, otherLocale } from "@/i18n/config";
import { cn, initial } from "@/lib/utils";
import type { GroupRef } from "@/lib/types";

/** Links the menu item to the form below it, which lives outside the menu. */
const SIGN_OUT_FORM = "sign-out";

/**
 * The same trick again, for the same reason. The same offer as
 * `locale-switcher.tsx`, which a stranger gets instead of this menu — kept
 * separate because there the form wraps its button, and here it cannot.
 */
const SET_LOCALE_FORM = "set-locale";

/**
 * Takes a name and the viewer's own groups — never a member row and never
 * anything wish-shaped.
 *
 * Every entry here is account-level, and deliberately so: this menu is reached
 * from screens that belong to no one group, so it must not ask which group is
 * current. Managing one is per group and lives on that group's own title
 * instead. What the viewer is buying spans every group, so that entry needs
 * only a group somewhere — an account with none has nothing to reserve.
 * docs/decisions/ui-patterns.md#the-group-title-is-the-switcher
 */
export function AccountMenu({
  name,
  groups,
  canCreate,
}: {
  name: string;
  groups: readonly GroupRef[];
  canCreate: boolean;
}) {
  const t = useTranslations("account");
  const create = useTranslations("groups.create");
  const other = otherLocale(useLocale());
  const Flag = LOCALE_FLAGS[other];
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

          {groups.length > 0 ? (
            <DropdownMenuItem asChild>
              <Link href="/buying">
                <ShoppingBagIcon />
                {t("buying")}
              </Link>
            </DropdownMenuItem>
          ) : null}

          {/*
           * The only way to `/start` for an account that already has a group:
           * `/` sends a groupless one there, and nothing else offers it.
           */}
          {canCreate ? (
            <DropdownMenuItem asChild>
              <Link href="/start">
                <PlusIcon />
                {create("action")}
              </Link>
            </DropdownMenuItem>
          ) : null}

          {/*
           * The label is written in the language it selects rather than in the
           * one on screen, so it can be read by somebody who opened this menu
           * precisely because they cannot read the rest of it — hence `lang`,
           * or a screen reader voices it in the document's language instead of
           * its own. The standalone switcher carries both for the same reason.
           */}
          <DropdownMenuItem asChild>
            <button type="submit" form={SET_LOCALE_FORM} lang={other}>
              <Flag />
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
