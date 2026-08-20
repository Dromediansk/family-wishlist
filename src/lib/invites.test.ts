import { describe, expect, it } from "vitest";

import { inviteUsable, safeReturnTo, type InviteState } from "@/lib/invites";

const NOW = new Date("2026-08-20T12:00:00.000Z");

function invite(overrides: Partial<InviteState> = {}): InviteState {
  return {
    revokedAt: null,
    expiresAt: "2026-09-19T12:00:00.000Z",
    maxUses: null,
    uses: 0,
    ...overrides,
  };
}

describe("inviteUsable", () => {
  it("accepts a fresh invite", () => {
    expect(inviteUsable(invite(), NOW)).toBe(true);
  });

  it("refuses a revoked invite", () => {
    expect(inviteUsable(invite({ revokedAt: "2026-08-19T00:00:00.000Z" }), NOW)).toBe(
      false,
    );
  });

  it("refuses an expired invite", () => {
    expect(inviteUsable(invite({ expiresAt: "2026-08-19T00:00:00.000Z" }), NOW)).toBe(
      false,
    );
  });

  it("accepts an invite that never expires", () => {
    expect(inviteUsable(invite({ expiresAt: null }), NOW)).toBe(true);
  });

  it("refuses an exhausted invite", () => {
    expect(inviteUsable(invite({ maxUses: 3, uses: 3 }), NOW)).toBe(false);
  });

  it("accepts an invite with uses left", () => {
    expect(inviteUsable(invite({ maxUses: 3, uses: 2 }), NOW)).toBe(true);
  });

  it("treats the expiry instant itself as expired", () => {
    expect(
      inviteUsable(invite({ expiresAt: NOW.toISOString() }), NOW),
    ).toBe(false);
  });
});

describe("safeReturnTo", () => {
  const token = "Ab3-_xY9";

  it("accepts an invite path", () => {
    expect(safeReturnTo(`/join/${token}`)).toBe(`/join/${token}`);
  });

  it("refuses a protocol-relative URL", () => {
    expect(safeReturnTo("//evil.com")).toBeNull();
  });

  it("refuses an absolute URL", () => {
    expect(safeReturnTo("https://evil.com")).toBeNull();
  });

  it("refuses a scheme hidden inside the path", () => {
    expect(safeReturnTo("/join/https://evil.com")).toBeNull();
    expect(safeReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("refuses an empty value", () => {
    expect(safeReturnTo("")).toBeNull();
  });

  it("refuses a missing value", () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
  });

  it("refuses any path that is not an invite", () => {
    // Narrow on purpose: /join/ is the only producer, so it is the only target.
    expect(safeReturnTo("/g/0e6bd0f4-0b64-4d8a-9a3f-1d1b2c3d4e5f")).toBeNull();
    expect(safeReturnTo("/start")).toBeNull();
  });

  it("refuses a malformed invite path", () => {
    expect(safeReturnTo("/join/")).toBeNull();
    expect(safeReturnTo("/join//evil.com")).toBeNull();
    expect(safeReturnTo(`/join/${token}?next=//evil.com`)).toBeNull();
    expect(safeReturnTo(`/join/${token}/../..`)).toBeNull();
    expect(safeReturnTo(`/join/${token}\n`)).toBeNull();
  });
});
