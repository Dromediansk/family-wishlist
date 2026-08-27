import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TermsDocument } from "@/components/terms-document";
import { alternatesFor } from "@/lib/site-url";

/**
 * The English terms — the same document as `/terms`, in the language this URL
 * names. `src/proxy.ts` pins it, so nothing here passes a locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: alternatesFor("/terms", "en"),
  };
}

export default function EnglishTermsPage() {
  return <TermsDocument />;
}
