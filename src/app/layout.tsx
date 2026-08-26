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
  return {
    title: t("name"),
    description: t("description"),
    applicationName: t("name"),
    appleWebApp: {
      capable: true,
      // Matches `short_name` in manifest.ts.
      title: t("name"),
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
 * Namespaces no client component may ask for, so none of them is shipped to the
 * browser.
 *
 * `legal` is the two policy pages — by far the largest namespace, and rendered
 * entirely on the server. `metadata` is read by `generateMetadata`, and
 * `errors` is worded inside Server Actions before it ever crosses back. Sending
 * all three would put tens of kilobytes of prose in front of every phone on
 * every route, which is the opposite of the brief.
 *
 * Adding a client component that needs one of these is what would break, and it
 * breaks loudly: next-intl throws for a namespace the provider does not carry.
 * docs/decisions/language.md
 */
const SERVER_ONLY_NAMESPACES = new Set(["legal", "metadata", "errors"]);

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

  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(
      ([namespace]) => !SERVER_ONLY_NAMESPACES.has(namespace),
    ),
  );

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
        <NextIntlClientProvider messages={clientMessages}>
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
