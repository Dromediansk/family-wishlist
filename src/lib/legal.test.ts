import { describe, expect, it } from "vitest";

import { LEGAL_DETAILS, missingLegalDetails } from "@/lib/legal";

import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

describe("missingLegalDetails", () => {
  it("names the details still waiting for a value", () => {
    expect(
      missingLegalDetails({ filled: "Ján Novák", blank: "" }),
    ).toEqual(["blank"]);
  });

  it("counts whitespace as unfilled — a space is not an address", () => {
    expect(missingLegalDetails({ spaces: "   " })).toEqual(["spaces"]);
  });

  it("hands back nothing once every detail is filled", () => {
    expect(
      missingLegalDetails({ name: "Ján Novák", email: "jan@example.sk" }),
    ).toEqual([]);
  });
});

/*
 * Deliberately no test that the real details are filled in — they ship empty,
 * and the red gap on the page is what says so. What is worth holding is that
 * each one can *describe* itself, since the hint is the whole of what the
 * reader and the operator get until a value arrives.
 *
 * The hints live in the catalogues now, one per language, so this also catches
 * a detail added to `legal.ts` and forgotten in one of the two files.
 */
describe("LEGAL_DETAILS", () => {
  it("gives every detail a hint to stand in for it, in both languages", () => {
    for (const [locale, hints] of [
      ["sk", sk.legal.hints],
      ["en", en.legal.hints],
    ] as const) {
      for (const key of Object.keys(LEGAL_DETAILS)) {
        const hint = (hints as Record<string, string>)[key];
        expect(hint, `${locale}: ${key}`).toBeDefined();
        expect(hint.trim(), `${locale}: ${key}`).not.toBe("");
      }
    }
  });
});
