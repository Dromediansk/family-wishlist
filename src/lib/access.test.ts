import { describe, expect, it } from "vitest";

import { resolveAccess } from "@/lib/access";
import type { Member, MemberStatus } from "@/lib/types";

const AUTH_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function memberRow(status: MemberStatus): Member & { status: MemberStatus } {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Miroslav",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    status,
  };
}

describe("resolveAccess", () => {
  it("treats a visitor with no session as anonymous", () => {
    expect(
      resolveAccess({ authUserId: null, member: memberRow("active") }),
    ).toEqual({ kind: "anonymous" });
  });

  it("lets an approved member in", () => {
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      member: memberRow("active"),
    });

    expect(access.kind).toBe("active");
    expect(access.kind === "active" && access.member.name).toBe("Miroslav");
  });

  it("holds an unapproved member at the door", () => {
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      member: memberRow("pending"),
    });

    expect(access.kind).toBe("pending");
  });

  it("does not admit a session whose member row is gone", () => {
    expect(resolveAccess({ authUserId: AUTH_USER_ID, member: null })).toEqual({
      kind: "anonymous",
    });
  });

  it("never carries status through to the member it returns", () => {
    const access = resolveAccess({
      authUserId: AUTH_USER_ID,
      member: memberRow("active"),
    });

    expect(access.kind === "active" && Object.keys(access.member)).not.toContain(
      "status",
    );
  });
});
