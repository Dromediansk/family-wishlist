/**
 * Ids that cannot be swapped for each other, or for a raw string off a URL.
 *
 * The constructors are the seam: only `src/lib/data/*` may call them, because
 * that is the only place a value has been read from the database and is known
 * to be what it claims. Everything downstream receives an already-branded id.
 */

export type UserId = string & { readonly __brand: "UserId" };
export type GroupId = string & { readonly __brand: "GroupId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };

export const asUserId = (value: string): UserId => value as UserId;
export const asGroupId = (value: string): GroupId => value as GroupId;
export const asMembershipId = (value: string): MembershipId =>
  value as MembershipId;
