import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

/** As in `manifest.ts` — the root layout's force-dynamic must not leak down here. */
export const dynamic = "force-static";

/**
 * Everything behind a session, listed so a crawler does not spend its budget
 * being redirected to `/login`. None of these is *protected* by this file —
 * `src/proxy.ts` and every page's own check do that — it only says where there
 * is nothing to read.
 *
 * `/login` is here as well as carrying `noindex`: the tag keeps it out of the
 * index if it is fetched anyway, this keeps it from being fetched.
 */
const PRIVATE = [
  "/g/",
  "/start",
  "/buying",
  "/received",
  "/join/",
  "/wish-photo/",
  "/auth/",
  "/login",
];

/**
 * The public surface is `/`, `/en`, the two policy pages and their twins, so
 * everything else is named above rather than allowed here.
 *
 * **Every AI crawler is allowed**, deliberately and by name — GPTBot and
 * ClaudeBot for training, OAI-SearchBot, Claude-SearchBot and PerplexityBot for
 * retrieval, Google-Extended for Gemini. Nothing on the public surface is worth
 * withholding, and a wish list is never on it. The named blocks say the same
 * thing the wildcard does, which is the point: a default that is silent gets
 * changed by accident, and blocking these is how most sites end up unreachable
 * to the only distribution an answer engine can offer.
 *
 * Note that `Google-Extended` does not gate AI Overviews — those read Google's
 * ordinary index, so `Googlebot` is the only lever there and blocking it would
 * remove the app from Search altogether.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const rule = { allow: "/", disallow: PRIVATE };

  return {
    rules: [{ userAgent: "*", ...rule }, { userAgent: AI_CRAWLERS, ...rule }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
