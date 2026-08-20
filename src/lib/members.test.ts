import { describe, expect, it } from "vitest";

import { asMembershipId, asUserId, type UserId } from "@/lib/ids";
import { sortMemberSummaries, toMemberSummary } from "@/lib/members";
import type { MemberSummary, MemberWithCount } from "@/lib/types";

/**
 * The grid leads with how many wishes are still free — for everyone but you.
 * On your own card that number would betray the one rule this app has, so the
 * row comes back without it. These tests pin that down, and the order the
 * cards are laid out in.
 */

const viewerId = asUserId("11111111-1111-4111-8111-111111111111");
const otherId = asUserId("22222222-2222-4222-8222-222222222222");

/**
 * The two ids differ on purpose: the mapper must key off the account, and a
 * membership id standing in for it would make every card the viewer's own.
 */
function member(id: UserId, name: string, wishCount: number): MemberWithCount {
  return {
    id: asMembershipId(`membership-of-${id}`),
    userId: id,
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
      id: asMembershipId(`membership-of-${otherId}`),
      userId: otherId,
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

/** Someone else's card, which is every card but one. */
function other(name: string): MemberSummary {
  return {
    ...member(asUserId(`id-${name}`), name, 0),
    viewerIsOwner: false,
    availableCount: 0,
  };
}

/** The viewer's own card — the half of the union with no availability. */
function own(name: string): MemberSummary {
  return { ...member(viewerId, name, 0), viewerIsOwner: true };
}

const names = (summaries: readonly MemberSummary[]) =>
  summaries.map((summary) => summary.name);

describe("sortMemberSummaries", () => {
  it("leads with the viewer's own card whatever their name is", () => {
    const sorted = sortMemberSummaries([
      other("Adam"),
      other("Beata"),
      own("Zuzka"),
    ]);

    expect(names(sorted)).toEqual(["Zuzka", "Adam", "Beata"]);
  });

  it("puts everyone else in alphabetical order", () => {
    const sorted = sortMemberSummaries([
      other("Peter"),
      other("Beata"),
      other("Adam"),
    ]);

    expect(names(sorted)).toEqual(["Adam", "Beata", "Peter"]);
  });

  it("files Slovak letters next to their base letter, not after Z", () => {
    // A code-point compare would put Čaňo and Šimon last, after Zuzka.
    const sorted = sortMemberSummaries([
      other("Zuzka"),
      other("Šimon"),
      other("Čaňo"),
      other("Adam"),
    ]);

    expect(names(sorted)).toEqual(["Adam", "Čaňo", "Šimon", "Zuzka"]);
  });

  it("leaves the array it was given alone", () => {
    const input = [other("Peter"), other("Adam")];

    sortMemberSummaries(input);

    expect(names(input)).toEqual(["Peter", "Adam"]);
  });

  it("keeps the incoming order for two people of the same name", () => {
    const first = { ...other("Anna"), id: asMembershipId("first") };
    const second = { ...other("Anna"), id: asMembershipId("second") };

    const sorted = sortMemberSummaries([first, second]);

    expect(sorted.map((summary) => summary.id)).toEqual(["first", "second"]);
  });
});
