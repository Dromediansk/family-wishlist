import { describe, expect, it } from "vitest";

import { normaliseNote, NOTE_MAX_LENGTH } from "@/lib/notes";

describe("normaliseNote", () => {
  it("turns the CRLF a textarea posts into plain newlines", () => {
    expect(normaliseNote("Otec: vŕtačka\r\nJana: kniha")).toBe(
      "Otec: vŕtačka\nJana: kniha",
    );
  });

  it("trims the whitespace around a note", () => {
    expect(normaliseNote("  Otec: vŕtačka\n\n  ")).toBe("Otec: vŕtačka");
  });

  it("keeps the blank lines somebody put inside a note", () => {
    expect(normaliseNote("Vianoce\n\nOtec: vŕtačka")).toBe(
      "Vianoce\n\nOtec: vŕtačka",
    );
  });

  it("reduces a note of nothing but whitespace to the empty string", () => {
    expect(normaliseNote(" \r\n\t ")).toBe("");
  });

  it("leaves an already-clean note alone", () => {
    expect(normaliseNote("Otec: vŕtačka")).toBe("Otec: vŕtačka");
  });
});

describe("NOTE_MAX_LENGTH", () => {
  it("is the number the migration's check constraint also names", () => {
    expect(NOTE_MAX_LENGTH).toBe(4000);
  });
});
