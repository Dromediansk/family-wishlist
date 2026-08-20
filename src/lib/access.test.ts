import { describe, expect, it } from "vitest";

import { resolveAccess, seedPeers } from "@/lib/access";
import { isGroupAdmin } from "@/lib/visibility";
import { asGroupId, asUserId } from "@/lib/ids";
import type { GroupRef, Viewer } from "@/lib/types";

/**
 * Three doors, and the pages route off nothing else: no session, a session with
 * no group, and a session inside at least one group.
 */

const AUTH_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = asUserId("11111111-1111-4111-8111-111111111111");
const PEER_ID = asUserId("33333333-3333-4333-8333-333333333333");

const family: GroupRef = {
  id: asGroupId("22222222-2222-4222-8222-222222222222"),
  name: "Naša rodina",
  role: "admin",
};

function viewer(groups: GroupRef[]): Viewer {
  return { userId: USER_ID, peers: new Set([USER_ID]), groups };
}

describe("resolveAccess", () => {
  it("treats a visitor with no session as anonymous", () => {
    expect(
      resolveAccess({ authUserId: null, viewer: viewer([family]) }),
    ).toEqual({ kind: "anonymous" });
  });

  it("does not admit a session whose account row is gone", () => {
    expect(resolveAccess({ authUserId: AUTH_USER_ID, viewer: null })).toEqual({
      kind: "anonymous",
    });
  });

  it("sends an account that belongs to no group to the groupless door", () => {
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      viewer: viewer([]),
    });

    expect(access.kind).toBe("groupless");
  });

  it("lets an account with one group in", () => {
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      viewer: viewer([family]),
    });

    expect(access.kind).toBe("member");
    expect(access.kind === "member" && access.viewer.groups[0].name).toBe(
      "Naša rodina",
    );
  });

  it("hands back the very viewer it was given, both ways through", () => {
    // Nothing is rebuilt or filtered on the way out, so a page can trust that
    // access.viewer is the one getViewer resolved.
    const groupless = viewer([]);
    const joined = viewer([family]);

    const first = resolveAccess({
      authUserId: AUTH_USER_ID,
      viewer: groupless,
    });
    const second = resolveAccess({ authUserId: AUTH_USER_ID, viewer: joined });

    expect(first.kind === "groupless" && first.viewer).toBe(groupless);
    expect(second.kind === "member" && second.viewer).toBe(joined);
  });

  it("counts a second group as no different from the first", () => {
    const work: GroupRef = { ...family, id: asGroupId(AUTH_USER_ID) };
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      viewer: viewer([family, work]),
    });

    expect(access.kind).toBe("member");
  });
});

/**
 * The seed is what keeps a groupless account out of the one trap this shape has:
 * `peer_user_ids` returns nothing for them, and an empty `peers` set would make
 * `canReadList` refuse them their own list.
 */
describe("seedPeers", () => {
  it("contains the viewer even when the query found nobody", () => {
    expect([...seedPeers(USER_ID, [])]).toEqual([USER_ID]);
  });

  it("keeps everyone the query did find", () => {
    const peers = seedPeers(USER_ID, [PEER_ID]);

    expect(peers.has(USER_ID)).toBe(true);
    expect(peers.has(PEER_ID)).toBe(true);
  });

  it("counts the viewer once when the query already named them", () => {
    expect(seedPeers(USER_ID, [USER_ID, PEER_ID]).size).toBe(2);
  });

  it("admits nobody it was not given", () => {
    expect(seedPeers(USER_ID, []).has(PEER_ID)).toBe(false);
  });
});

describe("isGroupAdmin", () => {
  it("recognises an admin of this group", () => {
    expect(isGroupAdmin(family)).toBe(true);
  });

  it("refuses an ordinary member", () => {
    expect(isGroupAdmin({ ...family, role: "member" })).toBe(false);
  });
});
