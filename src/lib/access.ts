import type { Member, MemberStatus } from "@/lib/types";

/**
 * Who is looking, in the only three states the app cares about.
 *
 * Kept as a pure function over already-fetched values, with no Supabase import,
 * so the gate can be tested for real instead of through mocks — the same reason
 * the redaction rules live in wishes.ts. Every page routes off this and nothing
 * else, so there is one place to read if you want to know who can see what.
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

  // Signed in with no member row. The database creates one on every auth.users
  // insert (0003_auth.sql), so this only happens if someone deleted the row out
  // from under a live session — a rejected applicant, most likely. Treat it as
  // signed out: they get the login screen, and signing in again re-applies.
  if (!input.member) return { kind: "anonymous" };

  const { status, ...member } = input.member;
  return status === "active"
    ? { kind: "active", member }
    : { kind: "pending", member };
}
