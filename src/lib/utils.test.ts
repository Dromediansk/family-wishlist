import { describe, expect, it } from "vitest";

import { formatDate, initial, wishCount } from "@/lib/utils";

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

describe("wishCount", () => {
  it("uses the three Slovak plural forms", () => {
    expect(wishCount(1)).toBe("1 želanie");
    expect(wishCount(3)).toBe("3 želania");
    expect(wishCount(5)).toBe("5 želaní");
    expect(wishCount(0)).toBe("0 želaní");
  });
});

describe("formatDate", () => {
  // Midday UTC throughout: a midnight timestamp lands on the previous or next
  // day depending on the machine's timezone, and these assert exact strings.
  it("writes a Slovak date, month in the genitive", () => {
    expect(formatDate("2025-12-12T12:00:00.000Z")).toBe("12. decembra 2025");
  });

  it("does not pad a single-digit day", () => {
    expect(formatDate("2026-01-05T12:00:00.000Z")).toBe("5. januára 2026");
  });

  it("reads a date on the year boundary as that year", () => {
    expect(formatDate("2026-01-01T12:00:00.000Z")).toBe("1. januára 2026");
  });
});
