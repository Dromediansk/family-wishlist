import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { InstallPrompt } from "@/components/install-prompt";
import { LiveRefresh } from "@/components/live-refresh";
import { OfflineBanner } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { getViewer } from "@/lib/data/access";
import { isConfigured } from "@/lib/supabase";
import { THEME_COLORS } from "@/lib/theme-colors";

import "./globals.css";

/**
 * Atkinson Hyperlegible Next, self-hosted rather than fetched through
 * `next/font/google`: the uncut file carries the Slovak carons Google's `latin`
 * slice stops short of, and local metrics restore the size-adjusted fallback
 * face. docs/decisions/ui-patterns.md#typography
 */
const atkinson = localFont({
  src: "./fonts/AtkinsonHyperlegibleNext.woff2",
  variable: "--font-sans-family",
  display: "swap",
  weight: "200 800",
});

/**
 * The name is the same in both languages — it is what the app is called, not a
 * description of it — so only the description is translated. `manifest.ts`
 * repeats the name and stays static for the same reason.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const name = t("name");
  return {
    title: name,
    description: t("description"),
    applicationName: name,
    appleWebApp: {
      capable: true,
      // Matches `short_name` in manifest.ts.
      title: name,
      statusBarStyle: "default",
    },
  };
}

/**
 * `viewportFit: "cover"` lets the installed app draw under the notch; the
 * safe-area padding below keeps content clear of it.
 *
 * `interactiveWidget: "resizes-content"` is here for the dialogs — it keeps a
 * pinned submit button above the on-screen keyboard. **Chromium only**; iOS is
 * not solved. docs/decisions/ui-patterns.md#the-keyboard
 *
 * Both live here because a viewport can only be declared document-wide.
 */
export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: THEME_COLORS.backgroundLight,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: THEME_COLORS.backgroundDark,
    },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/**
 * The only namespaces shipped to the browser: the ones a `"use client"`
 * component actually asks for. Everything else — the policy pages' prose, the
 * page bodies, `metadata`, and the `errors` worded inside Server Actions before
 * they ever cross back — is rendered on the server and stays there.
 *
 * An allowlist rather than a list of exclusions, because the default has to be
 * "stays on the server". A namespace added to the catalogues is read by a
 * Server Component until somebody says otherwise, and the whole point is that
 * tens of kilobytes of prose never land in front of a phone on every route.
 *
 * The payload is re-serialized on every write, too: `revalidatePath("/",
 * "layout")` re-renders this layout, so each action's response carries it again
 * to every open tab.
 *
 * Making a client component read one of these is what would break, and it
 * breaks loudly: next-intl throws for a namespace the provider does not carry —
 * add the namespace here and it works. docs/decisions/language.md
 */
const CLIENT_NAMESPACES = [
  "account",
  "common",
  "groups",
  "install",
  "invites",
  "members",
  "wishes",
];

/**
 * Built once per locale per process rather than per request — the layout is
 * `force-dynamic`, so this runs on every document, and the answer only ever has
 * two possible values.
 */
const clientMessagesByLocale = new Map<string, Record<string, unknown>>();

function clientMessages(
  locale: string,
  messages: Record<string, unknown>,
): Record<string, unknown> {
  let subset = clientMessagesByLocale.get(locale);
  if (!subset) {
    subset = Object.fromEntries(
      CLIENT_NAMESPACES.map((namespace) => [namespace, messages[namespace]]),
    );
    clientMessagesByLocale.set(locale, subset);
  }
  return subset;
}

/**
 * Every page depends on who is looking, so nothing may be prerendered or shared
 * between visitors. Without it, a build run before the environment variables are
 * set would bake the "connect a database" page in as static output.
 */
export const dynamic = "force-dynamic";

/**
 * Everything for every visitor, signed in or not. The header is not here — it
 * lives in `(app)/layout.tsx`, so `/login` and the 404 render without it. The
 * footer is, though: the legal pages it links to have to be reachable from
 * `/login`. The install nudge and the offline notice stay document-level for the
 * same kind of reason — the person most likely to install this has just landed
 * on `/login`.
 *
 * **There is deliberately no `<main>` here.** Every child owes its own
 * `<main className="flex-1">`, and both the element and the class are
 * load-bearing. docs/decisions/ui-patterns.md#layout-contract
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = clientMessages(locale, await getMessages());

  return (
    <html lang={locale}>
      <body className={`${atkinson.variable} font-sans`}>
        {/*
         * Once, here, so it survives navigation between routes — and behind a
         * boundary, or its round trip would sit in front of every document,
         * including the ones with no session to look up. It renders nothing, so
         * there is nothing to reserve space for.
         */}
        <Suspense fallback={null}>
          <LiveChannels />
        </Suspense>
        <NextIntlClientProvider messages={messages}>
          <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 sm:pb-10">
            <OfflineBanner />
            {children}
            <InstallPrompt />
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function LiveChannels() {
  // Unconfigured means no database to ask — getViewer() would throw. An
  // anonymous or groupless visitor simply has nothing to subscribe to.
  const viewer = isConfigured() ? await getViewer() : null;
  return <LiveRefresh groupIds={viewer?.groups.map((group) => group.id) ?? []} />;
}
