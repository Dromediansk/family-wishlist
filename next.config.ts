import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /**
   * Vercel charges Function Storage for every deployment it still retains, so a
   * byte in a bundle is paid for once per deploy rather than once. Two packages
   * were riding along that no route here can reach.
   *
   * `sharp` is an optional dependency of `next` itself, traced into every server
   * function for Image Optimization. This app has no `next/image` — a photo is
   * streamed straight out of Storage by `wish-photo/[wishId]` — so 26MB of
   * libvips and wasm was freight. Excluded files fail at runtime rather than at
   * build, so `no-restricted-imports` in `eslint.config.mjs` refuses
   * `next/image` instead; drop both together the day one is wanted.
   *
   * `@vercel/og` is reachable only from `icon.tsx` and `apple-icon.tsx`, which
   * compile to `route` entries. The `page` key leaves those two alone and takes
   * its ~3MB out of the eleven page bundles instead.
   *
   * Keys match the entry name, not the URL. `outputFileTracingIncludes` cannot
   * win a file back — `collect-build-traces` applies the excludes last — and
   * `images.unoptimized` does not drop `sharp` at all; both were tried.
   */
  outputFileTracingExcludes: {
    "/**/*": ["node_modules/@img/**", "node_modules/sharp/**"],
    "**/page": ["node_modules/next/dist/compiled/@vercel/og/**"],
  },

  experimental: {
    /**
     * Holds failed navigations, prefetches and Server Actions and retries them
     * on reconnect. Stands in for the service worker this app deliberately does
     * not have. docs/decisions/ui-patterns.md#the-installable-app
     */
    useOffline: true,

    /**
     * How long the browser may replay an already-visited page on a `<Link>`
     * navigation. Next's default for dynamic routes is 0, which showed the
     * skeleton twice for data that had not changed. Honest only because every
     * write another tab could be *showing* pings, and every ping purges the
     * whole cache.
     *
     * `static` stays at Next's default — nothing here is static.
     * docs/decisions/live-updates.md#why-going-back-doesnt-reload
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

/** Called bare, so it resolves its default path, `./src/i18n/request.ts`. */
export default createNextIntlPlugin()(nextConfig);
