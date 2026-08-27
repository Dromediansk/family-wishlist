import Link from "next/link";
import { GiftIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { LOCALE_FLAGS } from "@/components/flag-icons";
import { buttonVariants } from "@/components/ui/button";
import { LOCALE_LABELS, otherLocale, type Locale } from "@/i18n/config";
import { LEGAL_DETAILS } from "@/lib/legal";
import { localisedPath, siteUrl } from "@/lib/site-url";

/**
 * What a stranger — or a crawler — sees at `/` and at `/en`. The only page in
 * the app written for somebody who has not signed in and may never do so.
 *
 * **Server-rendered, and it has to stay that way.** GPTBot, ClaudeBot and
 * PerplexityBot do not run JavaScript, so any sentence moved behind a
 * `"use client"` boundary stops existing for them. Nothing here is interactive,
 * so nothing here needs to be.
 *
 * The prose lives in `messages/*.json` under `marketing`, which is deliberately
 * absent from `CLIENT_NAMESPACES` in the root layout: it is long, it renders on
 * the server, and it never needs to cross to the browser.
 */
export async function MarketingPage() {
  const t = await getTranslations("marketing");
  const brand = await getTranslations("metadata");
  const locale = await getLocale();

  const other = otherLocale(locale);
  const OtherFlag = LOCALE_FLAGS[other];

  const steps = [1, 2, 3] as const;
  const promises = ["noAds", "noTracking", "noEmails", "photos", "private"] as const;
  const questions = [1, 2, 3, 4, 5, 6] as const;

  return (
    <main className="flex-1">
      <StructuredData
        locale={locale}
        name={brand("name")}
        description={t("metaDescription")}
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        {/*
         * The same recipe as the home-screen icon and the login card: 36/64 is
         * the 56% ratio, and any rescale has to keep it.
         */}
        <div className="bg-primary mx-auto flex size-16 items-center justify-center rounded-xl">
          <GiftIcon
            className="text-primary-foreground size-9"
            strokeWidth={1.75}
          />
        </div>

        {/*
         * The page's only <h1>, and the app's name rather than a description of
         * it: this is the page that has to be findable by name. The sentence
         * under it does the explaining, and it comes first for a duller reason —
         * ChatGPT's snippet is the opening ~200 characters of the rendered body,
         * not the meta description, so whatever stands here is what gets quoted.
         */}
        <h1 className="mt-6 text-center text-2xl font-semibold text-balance sm:text-3xl">
          {brand("name")}
        </h1>

        <p className="text-muted-foreground mx-auto mt-4 max-w-[62ch] text-center text-balance">
          {t("lead")}
        </p>

        <Link
          href="/login"
          className={`${buttonVariants({ size: "lg" })} mx-auto mt-8`}
        >
          {t("start")}
        </Link>

        {/*
         * The other language, as a plain link to the twin URL. It sets no
         * cookie and needs no action, because on these pages the URL is what
         * decides the language.
         * docs/decisions/language.md#the-public-pages-pin-their-locale
         */}
        <Link
          href={localisedPath("/", other)}
          hrefLang={other}
          // `[&_svg]:size-5` as in the account menu: the flags carry no size of
          // their own, so whoever places one gives it one.
          className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-2 self-center text-sm whitespace-nowrap [&_svg]:size-5"
        >
          <OtherFlag />
          {LOCALE_LABELS[other]}
        </Link>

        <Section title={t("howItWorks.title")}>
          <ol className="flex flex-col gap-6">
            {steps.map((step) => (
              <li key={step}>
                <h3 className="font-semibold">{t(`howItWorks.step${step}Title`)}</h3>
                <p className="text-muted-foreground mt-1">
                  {t(`howItWorks.step${step}`)}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t("secret.title")}>
          <p>{t("secret.p1")}</p>
          <p>{t("secret.p2")}</p>
        </Section>

        <Section title={t("trust.title")}>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {promises.map((promise) => (
              <li key={promise}>{t(`trust.${promise}`)}</li>
            ))}
          </ul>
        </Section>

        {/*
         * Questions and answers in ordinary HTML, with no FAQPage markup:
         * Google deprecated that type in May 2026 and removed its
         * documentation. The section stays because it is worth reading — and
         * because a plain question with the answer under it is the shape an
         * answer engine can lift.
         */}
        <Section title={t("faq.title")}>
          <dl className="flex flex-col gap-6">
            {questions.map((question) => (
              <div key={question}>
                <dt className="font-semibold">{t(`faq.q${question}`)}</dt>
                <dd className="text-muted-foreground mt-1">
                  {t(`faq.a${question}`)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={t("cta.title")}>
          <p>{t("cta.body")}</p>
          <Link
            href="/login"
            className={`${buttonVariants({ size: "lg" })} mt-2 self-start`}
          >
            {t("start")}
          </Link>
        </Section>
      </div>
    </main>
  );
}

/**
 * What the app is, in the vocabulary Google's rich results understand.
 *
 * **This is a Search feature, not an AI one.** Google's own AI documentation
 * says in writing that no special schema is needed for AI surfaces, and the one
 * controlled study on the question — 1,885 pages that added JSON-LD against
 * 4,000 matched controls — found citations flat or slightly *down*. ChatGPT
 * strips this block out before the model ever sees the page. It stays because
 * it costs twenty lines and Software app is still a live result type; nothing
 * here should be grown in the hope of being quoted.
 *
 * A plain `<script>` rather than `next/script`, per Next's own guide: this is
 * data, not code to execute. `<` is escaped because the payload lands inside a
 * script element, where `</script>` in any string would close it early.
 */
function StructuredData({
  locale,
  name,
  description,
}: Readonly<{ locale: Locale; name: string; description: string }>) {
  const url = `${siteUrl()}${localisedPath("/", locale)}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    isAccessibleForFree: true,
    // Free, and meant to stay that way — docs/project-context.md says the app
    // is not commercial, and the policy pages say so to the reader.
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    author: { "@type": "Person", name: LEGAL_DETAILS.operatorName },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * The same shape `LegalSection` gives the policy pages — an `<h2>` over a 62ch
 * column. Not imported from there: that one belongs to the legal furniture and
 * carries its own reasons to change.
 */
function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-balance">{title}</h2>
      <div className="mt-4 flex max-w-[62ch] flex-col gap-3">{children}</div>
    </section>
  );
}
