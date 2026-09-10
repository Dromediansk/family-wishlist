import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import {
  LegalIdentifiers,
  LegalList,
  LegalPage,
  LegalSection,
  useLegalTags,
} from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Public on purpose — see `isPublic` in src/lib/routes.ts.
 *
 * The limits stated here are the ones the code actually has, including the three
 * ways the surprise can be spoiled. Naming them is deliberate: a promise this
 * app cannot keep would be worse than the admission.
 * docs/decisions/privacy-rule.md
 *
 * The section on illegal content is what the DSA (Reg. 2022/2065, arts. 14, 16
 * and 17) asks of a hosting service: state the restrictions, name a route for
 * reporting, and promise a reason when something is taken down. The contact
 * e-mail is that route — deliberately the same one, so there is no second
 * channel to keep alive.
 *
 * The prose is in `messages/*.json` under `legal.terms`; this file is its shape.
 */
export default function TermsPage() {
  const t = useTranslations("legal.terms");
  const tags = useLegalTags();

  const privacyLink = (chunks: React.ReactNode) => (
    <Link href="/privacy" className="text-primary underline underline-offset-4">
      {chunks}
    </Link>
  );

  return (
    <LegalPage title={t("title")}>
      <LegalSection title={t("about.title")}>
        <p>{t.rich("about.p1", tags)}</p>
        <p>{t.rich("about.p2", tags)}</p>
        {/* The trader, identified where the contract is formed. */}
        <LegalIdentifiers />
      </LegalSection>

      <LegalSection title={t("account.title")}>
        <p>{t.rich("account.p1", tags)}</p>
        <p>{t.rich("account.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("groups.title")}>
        <LegalList>
          <li>{t.rich("groups.invite", tags)}</li>
          <li>{t.rich("groups.validity", tags)}</li>
          <li>{t.rich("groups.cap", tags)}</li>
          <li>{t.rich("groups.noLeaving", tags)}</li>
          <li>{t.rich("groups.admin", tags)}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("content.title")}>
        <p>{t.rich("content.p1", tags)}</p>
        <p>{t.rich("content.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("moderation.title")}>
        <p>{t.rich("moderation.p1", tags)}</p>
        <p>{t.rich("moderation.p2", tags)}</p>
        <p>{t.rich("moderation.p3", tags)}</p>
      </LegalSection>

      <LegalSection title={t("secret.title")}>
        <p>{t.rich("secret.p1", tags)}</p>
        <p>{t.rich("secret.p2", tags)}</p>
        <LegalList>
          <li>{t.rich("secret.hole1", tags)}</li>
          <li>{t.rich("secret.hole2", tags)}</li>
          <li>{t.rich("secret.hole3", tags)}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={t("history.title")}>
        <p>{t.rich("history.p1", tags)}</p>
      </LegalSection>

      <LegalSection title={t("availability.title")}>
        <p>{t.rich("availability.p1", tags)}</p>
        <p>{t.rich("availability.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("liability.title")}>
        <p>{t.rich("liability.p1", tags)}</p>
      </LegalSection>

      <LegalSection title={t("termination.title")}>
        <p>{t.rich("termination.p1", { ...tags, privacy: privacyLink })}</p>
        <p>{t.rich("termination.p2", tags)}</p>
      </LegalSection>

      <LegalSection title={t("changes.title")}>
        <p>{t.rich("changes.p1", tags)}</p>
      </LegalSection>

      <LegalSection title={t("law.title")}>
        <p>{t.rich("law.p1", tags)}</p>
      </LegalSection>
    </LegalPage>
  );
}
