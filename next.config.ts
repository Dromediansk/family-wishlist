import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Holds failed navigations, prefetches and Server Actions and retries them
     * on reconnect. Stands in for the service worker this app deliberately does
     * not have. docs/content/ui-patterns.md#the-installable-app
     */
    useOffline: true,

    /**
     * How long the browser may replay an already-visited page on a `<Link>`
     * navigation. Next's default for dynamic routes is 0, which showed the
     * skeleton twice for data that had not changed. Honest only because every
     * write pings and every ping purges the whole cache.
     *
     * `static` stays at Next's default — nothing here is static.
     * docs/content/live-updates.md#why-going-back-doesnt-reload
     */
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
