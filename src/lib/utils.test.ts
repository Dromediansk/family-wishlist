import { describe, expect, it } from "vitest";

import { initial, wishCount } from "@/lib/utils";

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
