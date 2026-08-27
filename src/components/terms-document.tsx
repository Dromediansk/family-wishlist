import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import {
  LegalList,
  LegalPage,
  LegalSection,
  useLegalTags,
} from "@/components/legal-page";
import { localisedPath } from "@/lib/site-url";

/**
 * The terms' shape. Rendered by `/terms` and by `/en/terms`, which differ only
 * in the language the request pins and the `alternates` each one declares.
 * docs/decisions/language.md#the-public-pages-pin-their-locale
 *
 * The prose itself is in `messages/*.json` under `legal.terms`, so that the
 * terms can be read — and reviewed — as one document per language rather than
 * as fragments wrapped in JSX. This file is only their shape.
 */
export function TermsDocument() {
  const t = useTranslations("legal.terms");
  const tags = useLegalTags();
  const locale = useLocale();

  // Localised, or the English terms would send the reader to the Slovak policy:
  // each legal URL pins its own language.
  const privacyLink = (chunks: React.ReactNode) => (
    <Link
      href={localisedPath("/privacy", locale)}
      className="text-primary underline underline-offset-4"
    >
      {chunks}
    </Link>
  );

  return (
    <LegalPage title={t("title")}>
      <LegalSection title={t("about.title")}>
        <p>{t.rich("about.p1", tags)}</p>
        <p>{t.rich("about.p2", tags)}</p>
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
