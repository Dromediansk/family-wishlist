import { getTranslations } from "next-intl/server";

import type messages from "../../messages/sk.json";

/**
 * Every sentence a Server Action may refuse with. Slovak is the reference
 * catalogue, so a key that exists only in English is not one of these.
 */
export type ErrorKey = keyof typeof messages.errors;

/**
 * The wording for a refusal, in the language of the request that asked for it.
 *
 * This works inside a Server Action and a Route Handler — not because they can
 * see a URL segment, but because `src/i18n/request.ts` reads a cookie, which
 * they can. It is the reason the locale is a cookie.
 * docs/decisions/language.md
 */
export async function getErrorText() {
  const t = await getTranslations("errors");

  /*
   * One deliberate cast, and it lives here rather than at forty call sites.
   * next-intl types `t` against a literal key, and these callers choose theirs
   * at run time — from a Zod issue, or from `refusalFor`. `ErrorKey` is what
   * keeps that honest: the key still has to be one the catalogue defines.
   */
  return (key: ErrorKey, params?: Record<string, string | number>): string =>
    t(key as never, params as never);
}
