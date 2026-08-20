import { describe, expect, it } from "vitest";

import { inviteUsable, type InviteState } from "@/lib/invites";

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
