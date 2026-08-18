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
     * asking the server again, for a normal `<Link>` navigation. Every route
     * here is dynamic (`force-dynamic` in the root layout), and Next's default
     * for dynamic routes is 0 — which is why tapping "Všetci" out of a wish
     * list used to show the skeleton a second time for data that had not
     * changed.
     *
     * This ceiling does not govern the browser's own Back/Forward buttons. Next
     * reuses a page across those regardless of `staleTimes` — "to prevent
     * layout shift and to prevent losing the browser scroll position" per its
     * own docs — bounded only by invalidation, never by time. Both kinds of
     * replay are honest because every write pings and every ping purges the
     * whole cache in every tab (`syncFromLive`); the 60s only bounds the
     * `<Link>` case. The scenario it actually guards is a tab whose socket
     * believes it is still subscribed but has gone silent: `catchUpIfDeaf` in
     * `live-refresh.tsx` skips its own poll whenever `live` is `true`, so
     * nothing else corrects that tab, and a Back navigation there can replay a
     * page that is arbitrarily old.
     *
     * `static` is deliberately absent: with every route dynamic it governs only
     * how long a prefetched `loading.tsx` shell stays reusable, and Next's
     * 5-minute default is already the right answer for a skeleton. Overriding it
     * would cost extra requests and buy nothing.
     */
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
