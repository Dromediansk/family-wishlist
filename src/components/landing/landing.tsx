import { getTranslations } from "next-intl/server";

import { Hero } from "@/components/landing/hero";
import { SignIn } from "@/components/landing/sign-in";
import { StoryBeat } from "@/components/landing/story-beat";
import { STORY_BEATS } from "@/lib/landing";

import "./landing.css";

/**
 * The front door for somebody who has not signed in: what the app does, three
 * steps of how, and the way in twice.
 *
 * Two arrivals in equal measure, and one page serves both. Someone sent here by
 * `/join/{token}` has never heard of this and is being asked for a Google
 * account; someone who typed the address wants to know what this does that a
 * shared list does not. Both are answered by seeing the app, and by seeing the
 * one thing that makes it different.
 * docs/superpowers/specs/2026-09-06-landing-page-design.md
 */
export async function Landing({
  returnTo,
  error,
}: Readonly<{ returnTo: string | null; error?: string }>) {
  const t = await getTranslations("landing");
  const tLogin = await getTranslations("login");

  return (
    <>
      {/*
       * First, and outside every section, because it is positioned against the
       * initial containing block. Nothing between it and <body> may be
       * `relative` — see the comment on `.landing-wash`.
       */}
      <div aria-hidden className="landing-wash" />

      <Hero returnTo={returnTo} error={error} />

      {STORY_BEATS.map((beat) => (
        <StoryBeat key={beat.key} beat={beat} />
      ))}

      <section className="landing-reveal border-t py-12 text-center sm:py-16">
        <h2 className="text-xl font-semibold text-balance">
          {t("closingTitle")}
        </h2>
        <SignIn returnTo={returnTo} className="mt-6 flex justify-center" />
        <p className="text-muted-foreground mx-auto mt-6 max-w-[52ch] text-sm text-balance">
          {returnTo ? tLogin("footnoteInvite") : tLogin("footnote")}
        </p>
      </section>
    </>
  );
}
