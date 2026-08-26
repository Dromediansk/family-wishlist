import { describe, expect, it } from "vitest";

import { isLocale, otherLocale, pickLocale } from "./config";

describe("pickLocale", () => {
  it("falls back to Slovak with no header", () => {
    expect(pickLocale(null)).toBe("sk");
    expect(pickLocale(undefined)).toBe("sk");
    expect(pickLocale("")).toBe("sk");
  });

  it("matches on the primary subtag, so any English is English", () => {
    expect(pickLocale("en-GB")).toBe("en");
    expect(pickLocale("en-US,en;q=0.9")).toBe("en");
    expect(pickLocale("sk-SK")).toBe("sk");
  });

  it("prefers the highest q-value rather than the first entry", () => {
    expect(pickLocale("de,en;q=0.8,sk;q=0.9")).toBe("sk");
    expect(pickLocale("de,sk;q=0.3,en;q=0.7")).toBe("en");
  });

  it("keeps header order within one quality band", () => {
    expect(pickLocale("en,sk")).toBe("en");
    expect(pickLocale("sk,en")).toBe("sk");
  });

  it("ignores languages the app does not have", () => {
    expect(pickLocale("de-DE,fr;q=0.8")).toBe("sk");
  });

  it("treats q=0 as a refusal", () => {
    expect(pickLocale("en;q=0,sk;q=0.5")).toBe("sk");
    expect(pickLocale("en;q=0")).toBe("sk");
  });

  it("answers the wildcard with the default", () => {
    expect(pickLocale("*")).toBe("sk");
    expect(pickLocale("de,*;q=0.5")).toBe("sk");
  });

  it("survives a malformed q without treating it as the best match", () => {
    expect(pickLocale("en;q=banana,sk;q=0.2")).toBe("sk");
  });
});

describe("isLocale", () => {
  it("admits only the two languages", () => {
    expect(isLocale("sk")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("otherLocale", () => {
  it("is the one the switcher offers", () => {
    expect(otherLocale("sk")).toBe("en");
    expect(otherLocale("en")).toBe("sk");
  });
});
