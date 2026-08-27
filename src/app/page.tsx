import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Landing } from "@/components/landing";
import { alternatesFor } from "@/lib/site-url";

/**
 * The Slovak front door, and the URL every link and every citation points at.
 *
 * It sits outside `(app)` on purpose: a signed-in visitor is redirected away
 * before anything renders, and a stranger should not be wearing the app's
 * header while being told what the app is. `/en` is the same page under the
 * other language, and the two have to stay structurally identical — they are
 * each other's hreflang twin.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  const brand = await getTranslations("metadata");

  return {
    /*
     * Spelled out rather than left to `title.template` in the root layout: a
     * template does not apply to the segment that declares it, and this page
     * *is* that segment. `/en` is one segment down and gets the same string
     * from the template — keep the two in step by hand, and keep the name in
     * both, because being findable by name is most of what this page is for.
     */
    title: `${t("metaTitle")} · ${brand("name")}`,
    description: t("metaDescription"),
    alternates: alternatesFor("/", "sk"),
  };
}

export default function HomePage() {
  return <Landing />;
}
