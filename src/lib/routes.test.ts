import { describe, expect, it } from "vitest";

import { SIGNED_OUT_HOME, isPublic, signInPath } from "@/lib/routes";

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

describe("signInPath", () => {
  it("is the bare home when there is nothing to carry", () => {
    expect(signInPath()).toBe(SIGNED_OUT_HOME);
    expect(signInPath({})).toBe(SIGNED_OUT_HOME);
    expect(signInPath({ error: undefined })).toBe(SIGNED_OUT_HOME);
  });

  it("stays public whatever it carries — otherwise the bounce loops", () => {
    for (const path of [
      signInPath(),
      signInPath({ error: "nope" }),
      signInPath({ returnTo: "/join/abc123" }),
    ]) {
      expect(isPublic(new URL(path, "https://example.test").pathname)).toBe(
        true,
      );
    }
  });

  it("escapes what it is handed, so a refusal cannot forge a parameter", () => {
    const path = signInPath({ error: "a&returnTo=/evil b" });
    expect(
      new URL(path, "https://example.test").searchParams.get("returnTo"),
    ).toBeNull();
    expect(
      new URL(path, "https://example.test").searchParams.get("error"),
    ).toBe("a&returnTo=/evil b");
  });

  it("carries both parameters back out unchanged", () => {
    const query = new URL(
      signInPath({ error: "Ups, niečo sa pokazilo", returnTo: "/join/abc" }),
      "https://example.test",
    ).searchParams;

    expect(query.get("error")).toBe("Ups, niečo sa pokazilo");
    expect(query.get("returnTo")).toBe("/join/abc");
  });
});
