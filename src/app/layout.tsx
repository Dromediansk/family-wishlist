import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { GiftIcon } from "lucide-react";

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
  title: "Family Wish List",
  description: "What everyone would like, and who is quietly buying what.",
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10">
          <header className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <GiftIcon className="text-primary size-5" />
              Family Wish List
            </Link>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="text-muted-foreground mt-12 text-xs">
            Everyone can see what others have claimed — except the person whose
            list it is.
          </footer>
        </div>
      </body>
    </html>
  );
}
