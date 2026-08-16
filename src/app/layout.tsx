import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { InstallPrompt } from "@/components/install-prompt";
import { LiveRefresh } from "@/components/live-refresh";
import { OfflineBanner } from "@/components/offline-banner";
import { SiteHeader } from "@/components/site-header";
import { THEME_COLORS } from "@/lib/theme-colors";

import "./globals.css";

/**
 * Atkinson Hyperlegible Next — drawn by the Braille Institute for readers with
 * low vision. Its letterforms are deliberately hard to confuse (the tail on the
 * l, the base serif on the 1, wide-open apertures on a/e/o) and its x-height is
 * large, so a given pixel size reads bigger than a neutral grotesque at the same
 * size. This app is read by grandparents on phones; that is the whole brief.
 *
 * Self-hosted rather than fetched from `next/font/google`, for two reasons.
 *
 * The file is the upstream variable font, uncut, so it carries the whole Latin
 * range. Google serves this family in per-script slices whose `latin` slice
 * stops at U+00FF — below every Slovak caron and the ŕ/ĺ — and `next/font/local`
 * has no way to attach a `unicode-range` per file, so one complete file is both
 * simpler and the only way to be sure č, ď, ľ, ĺ, ň, ŕ, š, ť and ž come from
 * this typeface and not the system fallback.
 *
 * And `next/font/local` reads the metrics out of the file with fontkit instead
 * of looking them up in Next's `capsize-font-metrics.json`, which has no entry
 * for this family — the table predates the 2025 "Next" release, though it does
 * carry the 2020 original. That lookup miss is what made the Google loader warn
 * and skip the size-adjusted fallback face, the one that keeps the page from
 * reflowing when the real font swaps in. Reading the file cannot miss, so the
 * fallback is generated from measured values and there is nothing to hand-tune.
 *
 * Don't be tempted to hand-write that fallback from the OS/2 xAvgCharWidth
 * field: fonts disagree on what that field averages over, so comparing it
 * across two families is meaningless. Next measures a frequency-weighted
 * lowercase string in both, which is the comparison that means something.
 */
const atkinson = localFont({
  src: "./fonts/AtkinsonHyperlegibleNext.woff2",
  variable: "--font-sans-family",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "Rodinný zoznam želaní",
  description: "Čo by si kto želal a kto potichu kupuje čo.",
  applicationName: "Rodinný zoznam želaní",
  appleWebApp: {
    capable: true,
    // The home screen label. Matches `short_name` in manifest.ts.
    title: "Želania",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` lets the installed app draw under the notch and the
 * home indicator; the safe-area padding on the container below keeps content
 * out from under them.
 */
export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: THEME_COLORS.backgroundLight,
    },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.backgroundDark },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

/**
 * Every page depends on who is looking — a list renders differently for its
 * owner than for anyone else — so nothing here may be prerendered or shared
 * between visitors. Without this, a build run before the environment variables
 * are set would bake the "connect a database" page in as static output.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body className={`${atkinson.variable} font-sans`}>
        {/* Mounted once here so it survives navigation between routes. */}
        <LiveRefresh />
        <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 sm:pb-10">
          <OfflineBanner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <InstallPrompt />
        </div>
      </body>
    </html>
  );
}
