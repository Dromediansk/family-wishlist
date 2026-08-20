import { describe, expect, it } from "vitest";

import { groupInPath, MAX_GROUPS_PER_ACCOUNT } from "@/lib/groups";
import { asGroupId } from "@/lib/ids";

const FAMILY = asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const WORK = asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
const STRANGERS = asGroupId("cccccccc-cccc-4ccc-8ccc-cccccccccccc");

const groups = [{ id: FAMILY }, { id: WORK }];

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
  it("is the number the refusal quotes", () => {
    expect(MAX_GROUPS_PER_ACCOUNT).toBe(5);
  });
});
