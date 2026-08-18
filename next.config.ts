import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Holds failed navigations, prefetches and Server Actions instead of
     * throwing, and retries them once the connection is back. Phones on a weak
     * signal are the normal case here, and this replaces a service worker —
     * which we deliberately don't have, because every route renders differently
     * per viewer and cached HTML could show someone their own claimed wishes.
     */
    useOffline: true,

    /**
     * How long the browser may replay a page it has already visited instead of
     * asking the server again. Every route here is dynamic (`force-dynamic` in
     * the root layout), and Next's default for dynamic routes is 0 — which is
     * why tapping back out of a wish list used to show the skeleton a second
     * time for data that had not changed.
     *
     * 60 seconds is not a freshness target. Every write pings, and every ping
     * purges the whole cache in every tab (`syncFromLive`), so a page is
     * replayed only while nothing has changed anywhere. This is the ceiling for
     * a tab whose socket died without saying so and whose 30s deaf-poll and
     * visibilitychange catch-up both missed.
     */
    staleTimes: { dynamic: 60, static: 180 },
  },
};

export default nextConfig;
