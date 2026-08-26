import type { z } from "zod";
import { getTranslations } from "next-intl/server";

import type messages from "../../messages/sk.json";

/**
 * Every sentence a Server Action may refuse with. Slovak is the reference
 * catalogue, so a key that exists only in English is not one of these.
 */
export type ErrorKey = keyof typeof messages.errors;

/**
 * The wording for a refusal, in the language of the request that asked for it.
 * Passed to a helper rather than re-derived there — one per action, threaded.
 *
 * This works inside a Server Action and a Route Handler — not because they can
 * see a URL segment, but because `src/i18n/request.ts` reads a cookie, which
 * they can. It is the reason the locale is a cookie.
 * docs/decisions/language.md
 */
export type ErrorText = (
  key: ErrorKey,
  params?: Record<string, string | number>,
) => string;

export async function getErrorText(): Promise<ErrorText> {
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

/**
 * The first thing wrong, as a message key plus whatever that constraint knows.
 *
 * A Zod message *is* the key, and the numbers in the sentence are read back off
 * the issue rather than repeated in the catalogue — so raising a `.max()`, or a
 * byte limit carried in a `.refine()`'s `params`, cannot leave the sentence
 * quoting the old number in either language.
 *
 * It lives beside `getErrorText` because this is the seam between Zod and the
 * catalogue, and every action crosses it. docs/decisions/language.md
 */
export function firstIssue(error: z.ZodError): {
  key: ErrorKey;
  params: Record<string, string | number>;
} {
  const issue = error.issues[0];
  if (!issue) return { key: "invalid", params: {} };

  const params: Record<string, string | number> = {};
  if ("maximum" in issue && typeof issue.maximum === "number") {
    params.max = issue.maximum;
  }
  // A `.refine()` has no `maximum` of its own, so it says what it knows here.
  if (issue.code === "custom" && issue.params) {
    Object.assign(params, issue.params);
  }
  return { key: issue.message as ErrorKey, params };
}
