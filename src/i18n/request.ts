import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { isLocale, LOCALE_COOKIE, pickLocale } from "./config";

/**
 * Resolves the language for one request, and is the reason the locale is a
 * cookie rather than a URL segment: this runs in Server Components, Server
 * Actions and Route Handlers alike, so a Zod message minted inside an action
 * comes out in the same language as the page that called it.
 *
 * A locale must be returned explicitly — there is no middleware to infer one.
 *
 * No cookie is written here. A first visit is answered from `Accept-Language`
 * and stays that way until somebody actually picks a language, so nobody is
 * redirected and no visitor is given a cookie they did not ask for.
 * docs/decisions/language.md
 */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(chosen)
    ? chosen
    : pickLocale((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
