import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PrivacyDocument } from "@/components/privacy-document";
import { alternatesFor } from "@/lib/site-url";

/**
 * The English privacy policy — the same document as `/privacy`, in the language
 * this URL names. `src/proxy.ts` pins it, so nothing here passes a locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/privacy", "en"),
  };
}

export default function EnglishPrivacyPage() {
  return <PrivacyDocument />;
}
