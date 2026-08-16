import { describe, expect, it } from "vitest";

import { toMemberSummary } from "@/lib/members";
import type { MemberWithCount } from "@/lib/types";

/**
 * The grid leads with how many wishes are still free — for everyone but you.
 * On your own card that number would betray the one rule this app has, so the
 * row comes back without it. These tests pin that down.
 */

const viewerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function member(id: string, name: string, wishCount: number): MemberWithCount {
  return {
    id,
    name,
    role: "member",
    createdAt: "2026-01-01T00:00:00.000Z",
    wishCount,
  };
}

describe("toMemberSummary", () => {
  it("reports both numbers for someone else's list", () => {
    const summary = toMemberSummary(
      member(otherId, "Anna", 5),
      new Map([[otherId, 2]]),
      viewerId,
    );

    expect(summary).toEqual({
      id: otherId,
      name: "Anna",
      role: "member",
      createdAt: "2026-01-01T00:00:00.000Z",
      wishCount: 5,
      viewerIsOwner: false,
      availableCount: 2,
    });
  });

  it("carries no availability at all on the viewer's own list", () => {
    const summary = toMemberSummary(
      member(viewerId, "Zuzka", 5),
      // Even if a free count for the viewer ever reaches this far, it stops here.
      new Map([[viewerId, 3]]),
      viewerId,
    );

    expect(summary.wishCount).toBe(5);
    expect(summary.viewerIsOwner).toBe(true);
    expect(Object.keys(summary)).not.toContain("availableCount");
    // Nothing in the serialized row hints at a number below the total.
    expect(JSON.stringify(summary)).not.toContain("availableCount");
  });

  it("reads a fully claimed list as zero available, not as empty", () => {
    const summary = toMemberSummary(
      member(otherId, "Anna", 3),
      new Map(),
      viewerId,
    );

    expect(summary.wishCount).toBe(3);
    expect(summary).toHaveProperty("availableCount", 0);
  });

  it("gives an empty list zeroes rather than undefined", () => {
    const summary = toMemberSummary(
      member(otherId, "Anna", 0),
      new Map(),
      viewerId,
    );

    expect(summary.wishCount).toBe(0);
    expect(summary).toHaveProperty("availableCount", 0);
  });
});
