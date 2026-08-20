/**
 * Is this invite still a door? Pure, and `now` is an argument rather than a
 * call to `Date.now()`, so every branch is testable without mocking a clock.
 *
 * docs/content/groups.md#invites
 */

export type InviteState = {
  revokedAt: string | null;
  expiresAt: string | null;
  /** Null means unlimited. */
  maxUses: number | null;
  uses: number;
};

export function inviteUsable(invite: InviteState, now: Date): boolean {
  if (invite.revokedAt !== null) return false;

  // The expiry instant is past, not present: an invite good "until noon" is
  // not good at noon.
  if (invite.expiresAt !== null && new Date(invite.expiresAt) <= now) {
    return false;
  }

  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false;

  return true;
}
