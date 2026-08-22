import { describe, expect, it } from "vitest";

import {
  groupIdFromPath,
  groupInPath,
  groupsWorthNaming,
  MAX_GROUPS_PER_ACCOUNT,
} from "@/lib/groups";
import { asGroupId } from "@/lib/ids";

const FAMILY = asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const WORK = asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
const STRANGERS = asGroupId("cccccccc-cccc-4ccc-8ccc-cccccccccccc");

const groups = [{ id: FAMILY }, { id: WORK }];

describe("groupIdFromPath", () => {
  it("reads the id off a group grid", () => {
    expect(groupIdFromPath(`/g/${WORK}`)).toBe(WORK);
  });

  it("reads it off a nested page", () => {
    expect(groupIdFromPath(`/g/${WORK}/member/somebody`)).toBe(WORK);
  });

  it("returns null outside /g/", () => {
    expect(groupIdFromPath("/buying")).toBeNull();
    expect(groupIdFromPath("/")).toBeNull();
    expect(groupIdFromPath("/groups/x")).toBeNull();
  });

  it("returns null when /g/ names nothing", () => {
    expect(groupIdFromPath("/g")).toBeNull();
    expect(groupIdFromPath("/g/")).toBeNull();
  });

  it("hands back whatever was typed, having proved nothing", () => {
    expect(groupIdFromPath("/g/not-a-uuid")).toBe("not-a-uuid");
  });
});

describe("groupInPath", () => {
  it("finds the group whose grid the path is", () => {
    expect(groupInPath(`/g/${WORK}`, groups)).toEqual({ id: WORK });
  });

  it("finds it under a nested page too", () => {
    expect(groupInPath(`/g/${FAMILY}/family`, groups)).toEqual({ id: FAMILY });
  });

  it("returns null on an account-level screen", () => {
    expect(groupInPath("/buying", groups)).toBeNull();
    expect(groupInPath("/start", groups)).toBeNull();
  });

  it("returns null for a group the viewer is not in", () => {
    expect(groupInPath(`/g/${STRANGERS}`, groups)).toBeNull();
  });

  it("does not match a longer id that starts with a shorter one", () => {
    expect(groupInPath(`/g/${WORK}extra`, groups)).toBeNull();
  });

  it("returns null when the viewer has no groups", () => {
    expect(groupInPath(`/g/${WORK}`, [])).toBeNull();
  });
});

describe("MAX_GROUPS_PER_ACCOUNT", () => {
  it("pins the advertised cap, so raising it is a decision and not an accident", () => {
    expect(MAX_GROUPS_PER_ACCOUNT).toBe(5);
  });
});

describe("groupsWorthNaming", () => {
  it("says nothing to distinguish when the viewer is in one group", () => {
    expect(groupsWorthNaming([{ id: FAMILY }])).toBe(false);
  });

  it("says nothing to distinguish for a groupless account either", () => {
    expect(groupsWorthNaming([])).toBe(false);
  });

  it("says a name distinguishes something from two groups up", () => {
    expect(groupsWorthNaming(groups)).toBe(true);
  });
});
