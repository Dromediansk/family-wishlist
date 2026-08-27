import type { MetadataRoute } from "next";

import { LOCALES } from "@/i18n/config";
import { localisedPath, PUBLIC_PATHS, siteUrl } from "@/lib/site-url";

/** As in `manifest.ts` — the root layout's force-dynamic must not leak down here. */
export const dynamic = "force-static";

/**
 * Six URLs: three pages, each in both languages.
 *
 * Built from `PUBLIC_PATHS` rather than written out, so a page cannot be opened
 * to crawlers in `src/proxy.ts` and then forgotten here — both read the same
 * list. `alternates.languages` makes each entry name its twin, which is the
 * second half of what hreflang needs; the first half is on the pages
 * themselves. docs/decisions/language.md#the-public-pages-pin-their-locale
 *
 * No `lastModified`: these pages change when somebody edits them, and a date
 * regenerated on every build says only that a build happened.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const absolute = (path: string) => `${origin}${path === "/" ? "" : path}`;

  return PUBLIC_PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: absolute(localisedPath(path, locale)),
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((other) => [other, absolute(localisedPath(path, other))]),
        ),
      },
    })),
  );
}
