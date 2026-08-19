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

    /**
     * A wish photo travels inside the Server Action's own request body, and
     * Next caps that at 1MB. The browser downscales to a few hundred KB before
     * uploading, so this is headroom for the multipart framing and for a photo
     * that compresses badly — not a target. The bucket's own 2MiB limit and the
     * Zod check in `addWish` are what actually refuse an oversized one.
     */
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
