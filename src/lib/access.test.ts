import { describe, expect, it } from "vitest";

import { isGroupAdmin, resolveAccess } from "@/lib/access";
import { asGroupId, asUserId } from "@/lib/ids";
import type { GroupRef, Viewer } from "@/lib/types";

/**
 * Three doors, and the pages route off nothing else: no session, a session with
 * no group, and a session inside at least one group.
 */

const AUTH_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = asUserId("11111111-1111-4111-8111-111111111111");

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

  it("leaves a groupless viewer their own id in peers", () => {
    // Without it `canReadList` would refuse them their own list.
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      viewer: viewer([]),
    });

    expect(access.kind === "groupless" && access.viewer.peers.has(USER_ID)).toBe(
      true,
    );
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
