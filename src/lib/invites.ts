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

/**
 * The one refusal shown for a revoked, expired, or exhausted invite — a shared
 * constant so the join route and `joinWithInvite` cannot drift onto two
 * different sentences. docs/content/groups.md#invites
 */
export const INVITE_EXPIRED_MESSAGE = "Táto pozvánka už neplatí.";

/**
 * Where a sign-in may send the browser afterwards, and the cookie that carries
 * it across the OAuth round trip.
 *
 * The value arrives in a query string, so it is attacker-controlled: a naive
 * redirect to it turns `/login` into an open redirect that launders somebody
 * else's URL through a page the visitor trusts. So this is an allow-list of one
 * shape — `/join/{token}`, the only path anything in the app ever asks to
 * return to — and everything else falls back to `/`. A protocol-relative
 * `//evil.com`, an absolute URL and a scheme are all refused by not matching,
 * rather than by a list of things to look out for.
 *
 * The token itself never leaves this origin: it rides in an httpOnly cookie
 * rather than in the OAuth `redirect_to`, because an invite token *is*
 * permission to join a group and has no business in Google's URL bar, logs or
 * the browser's history. docs/content/groups.md#invites
 */
export const RETURN_TO_COOKIE = "wishlist-return-to";

/** Base64url, the alphabet `insertInvite` mints its token from. */
const RETURN_TO_PATTERN = /^\/join\/[A-Za-z0-9_-]{1,255}$/;

export function safeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return RETURN_TO_PATTERN.test(value) ? value : null;
}
