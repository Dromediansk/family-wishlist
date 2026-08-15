export type Role = "admin" | "member";

export type Member = {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
};

export type MemberWithCount = Member & {
  wishCount: number;
};

/**
 * A wish as shown to the person whose list it is.
 *
 * This type deliberately has NO claim fields. If someone claimed this item, the
 * owner must not find out — that is the whole point of the app. Keeping the two
 * read shapes as separate types means a leak is a type error rather than a
 * thing to remember.
 */
export type OwnerWish = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  createdAt: string;
};

/** A wish as shown to everyone except the owner: claim status included. */
export type ViewerWish = OwnerWish & {
  claimedBy: { id: string; name: string } | null;
  claimedAt: string | null;
};

/** A wish the current member has claimed, with whose list it came from. */
export type ClaimedWish = OwnerWish & {
  owner: { id: string; name: string };
  claimedAt: string | null;
};

/** Discriminated so a component can never render the wrong view by accident. */
export type WishListView =
  | { viewerIsOwner: true; wishes: OwnerWish[] }
  | { viewerIsOwner: false; wishes: ViewerWish[] };

export type ActionResult = { ok: true } | { ok: false; error: string };
