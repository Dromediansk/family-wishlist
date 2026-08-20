import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { InstallPrompt } from "@/components/install-prompt";
import { LiveRefresh } from "@/components/live-refresh";
import { OfflineBanner } from "@/components/offline-banner";
import { THEME_COLORS } from "@/lib/theme-colors";

import "./globals.css";

/**
 * Atkinson Hyperlegible Next, self-hosted rather than fetched through
 * `next/font/google`: the uncut file carries the Slovak carons Google's `latin`
 * slice stops short of, and local metrics restore the size-adjusted fallback
 * face. docs/content/ui-patterns.md#typography
 */
const atkinson = localFont({
  src: "./fonts/AtkinsonHyperlegibleNext.woff2",
  variable: "--font-sans-family",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "Prajem si..",
  description: "Čo by si kto prial a kto splní prianie komu.",
  applicationName: "Prajem si..",
  appleWebApp: {
    capable: true,
    // Matches `short_name` in manifest.ts.
    title: "Prajem si..",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` lets the installed app draw under the notch; the
 * safe-area padding below keeps content clear of it.
 *
 * `interactiveWidget: "resizes-content"` is here for the dialogs — it keeps a
 * pinned submit button above the on-screen keyboard. **Chromium only**; iOS is
 * not solved. docs/content/ui-patterns.md#the-keyboard
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
 * Every page depends on who is looking, so nothing may be prerendered or shared
 * between visitors. Without it, a build run before the environment variables are
 * set would bake the "connect a database" page in as static output.
 */
export const dynamic = "force-dynamic";

/**
 * Everything for every visitor, signed in or not. The header is not here — it
 * lives in `(app)/layout.tsx`, so `/login` and the 404 render without it. The
 * install nudge and the offline notice stay document-level on purpose: the
 * person most likely to install this has just landed on `/login`.
 *
 * **There is deliberately no `<main>` here.** Every child owes its own
 * `<main className="flex-1">`, and both the element and the class are
 * load-bearing. docs/content/ui-patterns.md#layout-contract
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body className={`${atkinson.variable} font-sans`}>
        {/* Once, here, so it survives navigation between routes. */}
        <LiveRefresh />
        <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 sm:pb-10">
          <OfflineBanner />
          {children}
          <InstallPrompt />
        </div>
      </body>
    </html>
  );
}
