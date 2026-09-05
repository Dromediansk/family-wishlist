import { describe, expect, it } from "vitest";

import { SIGNED_OUT_HOME, isPublic } from "@/lib/routes";

/**
 * One invariant carries the whole app: the page a signed-out visitor is bounced
 * to has to be one they are allowed to reach. Break it and every new visitor
 * gets a redirect loop instead of a sign-in screen.
 */

describe("isPublic", () => {
  it("lets a stranger reach the page they are bounced to", () => {
    expect(isPublic(SIGNED_OUT_HOME)).toBe(true);
  });

  it("lets a stranger open an invite, so the door can answer for itself", () => {
    expect(isPublic("/join/abc123")).toBe(true);
  });

  it("lets a stranger read the legal pages before signing in", () => {
    expect(isPublic("/privacy")).toBe(true);
    expect(isPublic("/terms")).toBe(true);
  });

  it("bounces everything behind a session", () => {
    for (const path of [
      "/start",
      "/buying",
      "/buying/history",
      "/received",
      "/g/22222222-2222-4222-8222-222222222222",
      "/g/22222222-2222-4222-8222-222222222222/family",
    ]) {
      expect(isPublic(path)).toBe(false);
    }
  });

  it("does not treat the old sign-in path as public", () => {
    expect(isPublic("/login")).toBe(false);
  });

  it("matches whole segments, not prefixes of them", () => {
    expect(isPublic("/join")).toBe(false);
    expect(isPublic("/privacy-policy")).toBe(false);
    expect(isPublic("/termsandconditions")).toBe(false);
  });
});
