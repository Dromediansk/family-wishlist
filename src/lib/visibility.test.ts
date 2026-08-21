import { describe, expect, it } from "vitest";

import { asGroupId, asMembershipId, asUserId } from "@/lib/ids";
import {
  canReadList,
  canRevokeInvite,
  claimedByOther,
  preferredName,
  revealClaimer,
  wishVisibleTo,
} from "@/lib/visibility";
import type { ClaimView, GroupRef } from "@/lib/types";

const ME = asUserId("11111111-1111-4111-8111-111111111111");
const PEER = asUserId("22222222-2222-4222-8222-222222222222");
const STRANGER = asUserId("33333333-3333-4333-8333-333333333333");

const FAMILY = asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const WORK = asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

const peers = new Set([ME, PEER]);

describe("canReadList", () => {
  it("lets the viewer read their own list", () => {
    expect(canReadList(peers, ME)).toBe(true);
  });

  it("lets the viewer read a peer's list", () => {
    expect(canReadList(peers, PEER)).toBe(true);
  });

  it("refuses a list belonging to nobody they share a group with", () => {
    expect(canReadList(peers, STRANGER)).toBe(false);
  });

  it("refuses everything when the peer set is empty", () => {
    expect(canReadList(new Set(), PEER)).toBe(false);
  });
});

describe("claimedByOther", () => {
  const AT = "2026-02-01T00:00:00.000Z";

  it("says a free wish is held by nobody", () => {
    expect(claimedByOther({ kind: "free" }, ME)).toBe(false);
  });

  it("says the viewer's own claim is not somebody else's", () => {
    const mine: ClaimView = { kind: "taken-by", at: AT, by: { id: ME, name: "Ja" } };
    expect(claimedByOther(mine, ME)).toBe(false);
  });

  it("says a named peer's claim is somebody else's", () => {
    const theirs: ClaimView = {
      kind: "taken-by",
      at: AT,
      by: { id: PEER, name: "Peer" },
    };
    expect(claimedByOther(theirs, ME)).toBe(true);
  });

  it("says an unnamed claim is somebody else's — a claim from a group the viewer is not in still counts", () => {
    expect(claimedByOther({ kind: "taken", at: AT }, ME)).toBe(true);
  });
});

describe("revealClaimer", () => {
  it("names a claimer the viewer shares a group with", () => {
    expect(revealClaimer(peers, PEER)).toBe(true);
  });

  it("hides a claimer from another group entirely", () => {
    expect(revealClaimer(peers, STRANGER)).toBe(false);
  });

  it("always names the viewer to themselves", () => {
    expect(revealClaimer(peers, ME)).toBe(true);
  });
});

describe("preferredName", () => {
  const groups: GroupRef[] = [
    { id: FAMILY, name: "Rodina", role: "member" },
    { id: WORK, name: "Kolegovia", role: "member" },
  ];
  const names = new Map([
    [FAMILY, "Miro"],
    [WORK, "Miroslav Pillár"],
  ]);

  it("prefers the name from the current group", () => {
    expect(preferredName(names, groups, WORK)).toBe("Miroslav Pillár");
  });

  it("falls back to the group the viewer joined first", () => {
    expect(preferredName(names, groups)).toBe("Miro");
  });

  it("skips a group the person is not in", () => {
    expect(preferredName(new Map([[WORK, "Miroslav Pillár"]]), groups)).toBe(
      "Miroslav Pillár",
    );
  });

  it("falls back to a question mark when no group is shared", () => {
    expect(preferredName(new Map(), groups)).toBe("?");
  });

  it("ignores a current group the person is not in", () => {
    expect(preferredName(new Map([[FAMILY, "Miro"]]), groups, WORK)).toBe(
      "Miro",
    );
  });
});

describe("canRevokeInvite", () => {
  const admin = asMembershipId("44444444-4444-4444-8444-444444444444");
  const other = asMembershipId("55555555-5555-4555-8555-555555555555");

  it("lets a group admin revoke somebody else's invite", () => {
    expect(
      canRevokeInvite(
        { groupId: FAMILY, membershipId: admin, role: "admin" },
        { groupId: FAMILY, createdBy: other },
      ),
    ).toBe(true);
  });

  it("lets an ordinary member revoke their own invite", () => {
    expect(
      canRevokeInvite(
        { groupId: FAMILY, membershipId: other, role: "member" },
        { groupId: FAMILY, createdBy: other },
      ),
    ).toBe(true);
  });

  it("refuses an ordinary member somebody else's invite", () => {
    expect(
      canRevokeInvite(
        { groupId: FAMILY, membershipId: other, role: "member" },
        { groupId: FAMILY, createdBy: admin },
      ),
    ).toBe(false);
  });

  it("refuses an invite belonging to another group, even to an admin", () => {
    expect(
      canRevokeInvite(
        { groupId: FAMILY, membershipId: admin, role: "admin" },
        { groupId: WORK, createdBy: admin },
      ),
    ).toBe(false);
  });
});

describe("wishVisibleTo", () => {
  it("is visible when the wish and the viewer share a tagged group", () => {
    expect(wishVisibleTo(new Set([FAMILY]), new Set([FAMILY, WORK]))).toBe(
      true,
    );
  });

  it("is invisible when they share no tagged group", () => {
    expect(wishVisibleTo(new Set([FAMILY]), new Set([WORK]))).toBe(false);
  });

  it("is invisible when the wish has no groups at all", () => {
    expect(wishVisibleTo(new Set(), new Set([FAMILY]))).toBe(false);
  });

  it("is invisible when the viewer has no groups at all", () => {
    expect(wishVisibleTo(new Set([FAMILY]), new Set())).toBe(false);
  });
});
