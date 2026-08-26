"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALES,
} from "@/i18n/config";

/**
 * Remember which language to render in.
 *
 * The second deliberate exception to the Server Action rules, alongside
 * `syncFromLive`: there is no caller to re-derive, because the choice belongs to
 * a browser rather than to an account and has to work on `/login` where nobody
 * is signed in yet; no group to enter; no row to write, so no `WHERE` clause;
 * and no `notifyChanged`, because nothing changed for anybody else — pinging
 * the group would re-render every other member's tab over one person's menu.
 *
 * Steps 3 and 5 still apply: the input is validated, and the whole layout is
 * revalidated so every string on screen comes back in the new language.
 * docs/decisions/language.md
 */
export async function setLocale(locale: string) {
  const chosen = z.enum(LOCALES).safeParse(locale);
  // Reachable by direct POST, and the only caller passes a literal — an
  // unparseable value is someone poking at it, so there is nobody to tell.
  if (!chosen.success) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, chosen.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  revalidatePath("/", "layout");
}
