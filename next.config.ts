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
     * How long the browser may replay an already-visited page instead of asking
     * the server again, on a `<Link>` navigation. Every route here is dynamic
     * (`force-dynamic` in the root layout) and Next's default for those is 0,
     * which is why tapping "Všetci" out of a wish list used to show the skeleton
     * a second time for data that had not changed.
     *
     * It does not govern the browser's own Back/Forward buttons — Next replays
     * those regardless of `staleTimes`, bounded by invalidation alone. Both are
     * honest because every write pings and every ping purges the whole cache
     * (`syncFromLive`). `static` is left at Next's 5-minute default: nothing
     * here is static, so it would only age the prefetched `loading.tsx` shell.
     * README, "Why going back doesn't reload", has the reasoning.
     */
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
