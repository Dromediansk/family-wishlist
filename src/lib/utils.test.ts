import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { formatDate, initial } from "@/lib/utils";

import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

describe("initial", () => {
  it("takes the first letter, uppercased", () => {
    expect(initial("Miroslav")).toBe("M");
    expect(initial("zuzana")).toBe("Z");
  });

  it("keeps Slovak diacritics intact", () => {
    expect(initial("Žofia")).toBe("Ž");
    expect(initial("ľubomír")).toBe("Ľ");
  });

  it("ignores surrounding whitespace", () => {
    expect(initial("  Ema ")).toBe("E");
  });

  it("falls back to a placeholder rather than rendering nothing", () => {
    expect(initial("")).toBe("?");
    expect(initial("   ")).toBe("?");
  });

  it("returns a whole character, not half a surrogate pair", () => {
    expect(initial("🎁")).toBe("🎁");
  });
});

/*
 * The plural forms used to be `wishCount()` in this file. They are an ICU
 * message now, so what is worth testing is that the catalogue picks the same
 * forms the hand-written rule did — `createTranslator` renders one without
 * React, a request or a database, so this stays a pure test.
 */
describe("the wish count message", () => {
  const skCount = createTranslator({ locale: "sk", messages: sk });
  const enCount = createTranslator({ locale: "en", messages: en });

  it("uses the three Slovak forms: 1, 2–4, and 0 with 5+", () => {
    expect(skCount("common.wishCount", { count: 1 })).toBe("1 želanie");
    expect(skCount("common.wishCount", { count: 3 })).toBe("3 želania");
    expect(skCount("common.wishCount", { count: 5 })).toBe("5 želaní");
    expect(skCount("common.wishCount", { count: 0 })).toBe("0 želaní");
  });

  it("uses the two English forms", () => {
    expect(enCount("common.wishCount", { count: 1 })).toBe("1 wish");
    expect(enCount("common.wishCount", { count: 3 })).toBe("3 wishes");
    expect(enCount("common.wishCount", { count: 0 })).toBe("0 wishes");
  });
});

describe("formatDate", () => {
  // Midday UTC throughout: a midnight timestamp lands on the previous or next
  // day depending on the machine's timezone, and these assert exact strings.
  it("writes a Slovak date, month in the genitive", () => {
    expect(formatDate("2025-12-12T12:00:00.000Z", "sk")).toBe(
      "12. decembra 2025",
    );
  });

  it("does not pad a single-digit day", () => {
    expect(formatDate("2026-01-05T12:00:00.000Z", "sk")).toBe("5. januára 2026");
  });

  it("reads a date on the year boundary as that year", () => {
    expect(formatDate("2026-01-01T12:00:00.000Z", "sk")).toBe("1. januára 2026");
  });

  it("writes an English date day-first, as it is read in Slovakia", () => {
    expect(formatDate("2025-12-12T12:00:00.000Z", "en")).toBe(
      "12 December 2025",
    );
  });

  it("keeps one formatter per locale rather than one per call", () => {
    // Same answer whichever order the two languages are asked in — the cache
    // must be keyed by locale, not shared between them.
    expect(formatDate("2026-01-05T12:00:00.000Z", "en")).toBe("5 January 2026");
    expect(formatDate("2026-01-05T12:00:00.000Z", "sk")).toBe("5. januára 2026");
    expect(formatDate("2026-01-05T12:00:00.000Z", "en")).toBe("5 January 2026");
  });
});
