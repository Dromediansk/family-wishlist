import type { Member, MemberStatus } from "@/lib/types";

/**
 * Who is looking. Every page routes off this and nothing else. Pure, with no
 * Supabase import, so it is tested for real rather than through mocks.
 * docs/content/membership.md#the-three-states
 */
export type Access =
  | { kind: "anonymous" }
  | { kind: "pending"; member: Member }
  | { kind: "active"; member: Member };

export function resolveAccess(input: {
  authUserId: string | null;
  member: (Member & { status: MemberStatus }) | null;
}): Access {
  if (!input.authUserId) return { kind: "anonymous" };

  // Signed in with no member row — only possible if it was deleted under a live
  // session. Treated as signed out; /auth/callback re-applies them on next
  // sign-in. docs/content/membership.md#rejoining-the-queue
  if (!input.member) return { kind: "anonymous" };

  const { status, ...member } = input.member;
  return status === "active"
    ? { kind: "active", member }
    : { kind: "pending", member };
}

/**
 * One spelling of the admin check, shared by the page, the header and the
 * actions. Takes a `Member`, not an `Access`: the caller must already have
 * established that this person is signed in and approved.
 */
export function isAdmin(member: Member): boolean {
  return member.role === "admin";
}
