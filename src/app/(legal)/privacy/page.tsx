import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import {
  LegalList,
  LegalPage,
  LegalSection,
  useLegalTags,
} from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Public on purpose — see `isPublic` in src/proxy.ts. Google's OAuth review
 * fetches this URL while signed out, and so does anybody deciding whether to
 * sign in at all.
 *
 * Everything stated here is checkable against the code: the schema in
 * supabase/migrations/, the OAuth call in src/app/actions/auth.ts and the bucket
 * settings in supabase/config.toml. If one of those changes, this page is part
 * of the change.
 *
 * The prose itself is in `messages/*.json` under `legal.privacy`, so that a
 * policy can be read — and reviewed — as one document per language rather than
 * as fragments wrapped in JSX. This file is only its shape.
 */
export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");
  const tags = useLegalTags();

  return (
    <LegalPage title={t("title")}>
      <LegalSection title={t("controller.title")}>
        <p>{t.rich("controller.p1", tags)}</p>
        <p>{t.rich("controller.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("stored.title")}>
        <LegalList>
          <li>{t.rich("stored.account", tags)}</li>
          <li>{t.rich("stored.groupName", tags)}</li>
          <li>{t.rich("stored.groups", tags)}</li>
          <li>{t.rich("stored.wishes", tags)}</li>
          <li>{t.rich("stored.claims", tags)}</li>
          <li>{t.rich("stored.history", tags)}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("notStored.title")}>
        <p>{t.rich("notStored.p1", tags)}</p>
        <p>{t.rich("notStored.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("lawfulBasis.title")}>
        <LegalList>
          <li>{t.rich("lawfulBasis.contract", tags)}</li>
          <li>{t.rich("lawfulBasis.legitimate", tags)}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("whoSees.title")}>
        <p>{t.rich("whoSees.p1", tags)}</p>
        <p>{t.rich("whoSees.p2", tags)}</p>
        <p>{t.rich("whoSees.p3", tags)}</p>
      </LegalSection>

      <LegalSection title={t("processors.title")}>
        <LegalList>
          <li>{t.rich("processors.vercel", tags)}</li>
          <li>{t.rich("processors.supabase", tags)}</li>
          <li>{t.rich("processors.google", tags)}</li>
        </LegalList>
        <p>{t.rich("processors.region", tags)}</p>
      </LegalSection>

      <LegalSection title={t("cookies.title")}>
        <p>{t.rich("cookies.p1", tags)}</p>
        <LegalList>
          <li>{t.rich("cookies.auth", tags)}</li>
          <li>{t.rich("cookies.returnTo", tags)}</li>
          <li>{t.rich("cookies.locale", tags)}</li>
          <li>{t.rich("cookies.installPrompt", tags)}</li>
        </LegalList>
        <p>{t.rich("cookies.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("retention.title")}>
        <p>{t.rich("retention.p1", tags)}</p>
        <p>{t.rich("retention.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("rights.title")}>
        <p>{t.rich("rights.p1", tags)}</p>
        <LegalList>
          <li>{t.rich("rights.correction", tags)}</li>
          <li>{t.rich("rights.erasure", tags)}</li>
        </LegalList>
        <p>{t.rich("rights.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("children.title")}>
        <p>{t.rich("children.p1", tags)}</p>
      </LegalSection>

      <LegalSection title={t("changes.title")}>
        <p>{t.rich("changes.p1", tags)}</p>
      </LegalSection>
    </LegalPage>
  );
}
