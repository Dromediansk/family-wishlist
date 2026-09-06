import { getTranslations } from "next-intl/server";

import { MockCard, MockFigure } from "@/components/landing/mock/mock-card";
import { MockList } from "@/components/landing/mock/mock-list";
import { SignIn } from "@/components/landing/sign-in";

/**
 * The top of the page: what this is, the way in, and a picture of the app with
 * the reservation quietly leaving it.
 *
 * NOT `relative`. The gradient behind the page is an absolutely positioned
 * element with no positioned ancestor — see `.landing-wash` in landing.css —
 * and a `relative` here would clip it to this section.
 */
export async function Hero({
  returnTo,
  error,
}: Readonly<{ returnTo: string | null; error?: string }>) {
  const t = await getTranslations("landing");
  const tMock = await getTranslations("landing.mock");

  return (
    <section className="grid items-center gap-10 pt-2 pb-16 sm:grid-cols-2 sm:gap-12 sm:pt-8 sm:pb-24">
      <div>
        <p className="landing-enter landing-enter-1 bg-accent text-accent-foreground inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {t("eyebrow")}
        </p>

        {/* The page's only h1. The app's name is in the header mark and the
            document title; a landing page leads with what it does. */}
        <h1 className="landing-enter landing-enter-2 mt-4 text-3xl leading-tight font-semibold text-balance">
          {t.rich("headline", {
            hl: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>

        <p className="landing-enter landing-enter-3 text-muted-foreground mt-4 max-w-[42ch] text-lg text-pretty">
          {t("sub")}
        </p>

        <SignIn
          returnTo={returnTo}
          className="landing-enter landing-enter-4 mt-7"
        />

        {error ? (
          <p className="text-destructive mt-4" role="alert">
            {error}
          </p>
        ) : null}

        {/* Every claim here is true of this app today — free, no ads, no
            analytics, invite-only. docs/project-context.md */}
        <p className="landing-enter landing-enter-4 text-muted-foreground mt-4 text-sm">
          {t("trust")}
        </p>
      </div>

      <MockFigure
        caption={tMock("figures.hero")}
        className="landing-enter landing-enter-5"
      >
        <div className="relative">
          {/*
           * The fan. `sm:` only: below it the columns have already collapsed,
           * and a 3.5° card cannot overflow a 360px viewport without clipping.
           * The tilt is a known cost — rotated text is harder for the
           * low-vision reader this app is built around — accepted because it
           * is confined to an illustration nobody has to read.
           * docs/superpowers/specs/2026-09-06-landing-page-design.md
           *
           * No `aria-hidden`, no sr-only echo of the caption: the enclosing
           * `MockFigure`'s caption is the one description of the whole
           * illustration.
           */}
          <MockCard
            caption={tMock("historyCaption")}
            className="text-muted-foreground absolute inset-x-0 top-8 hidden opacity-50 sm:block sm:rotate-3"
          />
          <MockList
            variant="vanishing"
            staggerRows
            className="landing-lift relative sm:-rotate-2"
          />
        </div>
      </MockFigure>
    </section>
  );
}
