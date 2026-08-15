import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { InstallPrompt } from "@/components/install-prompt";
import { LiveRefresh } from "@/components/live-refresh";
import { OfflineBanner } from "@/components/offline-banner";
import { SiteHeader } from "@/components/site-header";
import { THEME_COLORS } from "@/lib/theme-colors";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
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
