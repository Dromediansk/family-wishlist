import { describe, expect, it } from "vitest";

import {
  alternatesFor,
  localisedPath,
  publicPageLocale,
  PUBLIC_PATHS,
  resolveSiteUrl,
} from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("prefers the configured URL", () => {
    expect(resolveSiteUrl("https://prajemsi.sk", "ignored.vercel.app")).toBe(
      "https://prajemsi.sk",
    );
  });

  it("strips trailing slashes, so no URL is built with two", () => {
    expect(resolveSiteUrl("https://prajemsi.sk///", undefined)).toBe(
      "https://prajemsi.sk",
    );
  });

  it("falls back to Vercel's bare host, which carries no scheme", () => {
    expect(resolveSiteUrl(undefined, "prajemsi.vercel.app")).toBe(
      "https://prajemsi.vercel.app",
    );
  });

  it("treats an empty or blank value as unset rather than as an origin", () => {
    expect(resolveSiteUrl("", "prajemsi.vercel.app")).toBe(
      "https://prajemsi.vercel.app",
    );
    expect(resolveSiteUrl("   ", undefined)).toBe("http://localhost:3000");
  });

  it("lands on localhost when nothing is set", () => {
    expect(resolveSiteUrl(undefined, undefined)).toBe("http://localhost:3000");
  });
});

describe("localisedPath", () => {
  it("leaves Slovak paths alone — Slovak holds the bare URL", () => {
    expect(localisedPath("/", "sk")).toBe("/");
    expect(localisedPath("/privacy", "sk")).toBe("/privacy");
  });

  it("prefixes English, and does not leave the home page as a bare slash", () => {
    expect(localisedPath("/", "en")).toBe("/en");
    expect(localisedPath("/privacy", "en")).toBe("/en/privacy");
    expect(localisedPath("/terms", "en")).toBe("/en/terms");
  });

  it("never doubles a slash", () => {
    for (const path of PUBLIC_PATHS) {
      expect(localisedPath(path, "en")).not.toContain("//");
      expect(localisedPath(path, "sk")).not.toContain("//");
    }
  });
});

/*
 * `isPublic()` in src/proxy.ts answers from this, so a wrong `null` here is a
 * public page redirected to `/login` — which for robots.txt or a landing page
 * fails silently rather than loudly.
 */
describe("publicPageLocale", () => {
  it("names the language of each public page", () => {
    expect(publicPageLocale("/")).toBe("sk");
    expect(publicPageLocale("/privacy")).toBe("sk");
    expect(publicPageLocale("/terms")).toBe("sk");
    expect(publicPageLocale("/en")).toBe("en");
    expect(publicPageLocale("/en/privacy")).toBe("en");
    expect(publicPageLocale("/en/terms")).toBe("en");
  });

  it("says nothing about the app's own screens", () => {
    for (const path of ["/start", "/buying", "/g/abc", "/login", "/join/x"]) {
      expect(publicPageLocale(path), path).toBeNull();
    }
  });

  it("covers every public path in both languages", () => {
    for (const path of PUBLIC_PATHS) {
      for (const locale of ["sk", "en"] as const) {
        expect(publicPageLocale(localisedPath(path, locale))).toBe(locale);
      }
    }
  });
});

describe("alternatesFor", () => {
  it("points canonical at the page it was asked about, not at Slovak", () => {
    expect(alternatesFor("/privacy", "en").canonical).toBe("/en/privacy");
    expect(alternatesFor("/privacy", "sk").canonical).toBe("/privacy");
  });

  it("sends x-default to Slovak, the language an unrecognised browser gets", () => {
    for (const path of PUBLIC_PATHS) {
      const { languages } = alternatesFor(path, "en");
      expect(languages["x-default"]).toBe(languages.sk);
    }
  });

  /*
   * The failure this guards against is silent: `sl` is Slovenian, Google
   * accepts it without complaint, and every Slovak page would be annotated as
   * belonging to a country that never sees it.
   */
  it("spells Slovak `sk`", () => {
    const { languages } = alternatesFor("/", "sk");
    expect(Object.keys(languages).sort()).toEqual(["en", "sk", "x-default"]);
  });

  it("names the same cluster from either side, which is the reciprocity Google asks for", () => {
    for (const path of PUBLIC_PATHS) {
      expect(alternatesFor(path, "sk").languages).toEqual(
        alternatesFor(path, "en").languages,
      );
    }
  });

  it("gives every page a self-reference", () => {
    for (const path of PUBLIC_PATHS) {
      for (const locale of ["sk", "en"] as const) {
        const { canonical, languages } = alternatesFor(path, locale);
        expect(Object.values(languages)).toContain(canonical);
      }
    }
  });
});
