import { describe, expect, it } from "vitest";

import { LEGAL_DETAILS, missingLegalDetails } from "@/lib/legal";

describe("missingLegalDetails", () => {
  it("names the details still waiting for a value", () => {
    expect(
      missingLegalDetails({
        filled: { hint: "a", value: "Ján Novák" },
        blank: { hint: "b", value: "" },
      }),
    ).toEqual(["blank"]);
  });

  it("counts whitespace as unfilled — a space is not an address", () => {
    expect(
      missingLegalDetails({ spaces: { hint: "a", value: "   " } }),
    ).toEqual(["spaces"]);
  });

  it("hands back nothing once every detail is filled", () => {
    expect(
      missingLegalDetails({
        name: { hint: "a", value: "Ján Novák" },
        email: { hint: "b", value: "jan@example.sk" },
      }),
    ).toEqual([]);
  });
});

/*
 * Deliberately no test that the real details are filled in — they ship empty,
 * and the red gap on the page is what says so. What is worth holding is that
 * each one can *describe* itself, since the hint is the whole of what the
 * reader and the operator get until a value arrives.
 */
describe("LEGAL_DETAILS", () => {
  it("gives every detail a hint to stand in for it", () => {
    for (const [key, detail] of Object.entries(LEGAL_DETAILS)) {
      expect(detail.hint.trim(), key).not.toBe("");
    }
  });
});
