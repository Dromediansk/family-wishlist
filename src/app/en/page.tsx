import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Landing } from "@/components/landing";
import { alternatesFor } from "@/lib/site-url";

/**
 * The English front door — the same page as `/`, in the language this URL
 * names. `src/proxy.ts` pins it, so nothing here passes a locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/", "en"),
  };
}

export default function EnglishHomePage() {
  return <Landing />;
}
