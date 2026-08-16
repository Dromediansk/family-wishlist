export type Role = "admin" | "member";

/**
 * Anyone with a Google account can complete the sign-in flow — Supabase does
 * not restrict that — so everyone lands as `pending` and an admin lets them in.
 * The one exception is the first person ever to sign in, who becomes an active
 * admin, because otherwise there is nobody to approve anybody. See
 * `handle_new_auth_user` in supabase/migrations/0003_auth.sql.
 */
export type MemberStatus = "pending" | "active";

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
 * A member as shown on the family grid, discriminated the way `WishListView` is.
 *
 * On your own card there is no `availableCount` to render — not null, absent.
 * How many of your wishes are still free would say, in arithmetic, that the
 * rest are not, which is the one thing this app must never do. Splitting the
 * two shapes makes reaching for that number a type error rather than a thing to
 * remember.
 */
export type MemberSummary = MemberWithCount &
  ({ viewerIsOwner: true } | { viewerIsOwner: false; availableCount: number });

/**
 * A member plus the fields only an admin has any business seeing.
 *
 * Kept separate from `Member` so that email addresses reach the browser on one
 * screen — the admin's approval dialog — rather than being handed to everyone
 * with every member card.
 */
export type MemberAccount = Member & {
  status: MemberStatus;
  email: string | null;
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

/**
 * Everything `WishRow` displays.
 *
 * Structural, so that a wish which no longer exists can still be rendered: a
 * cancelled reservation on "Čo kupujem" is drawn from the notice that outlived
 * it, and has no wish id or creation date to offer.
 */
export type Displayable = Pick<OwnerWish, "title" | "description" | "url">;

/** One field of a reserved wish that the owner rewrote after it was claimed. */
export type WishChange = {
  field: "title" | "description" | "url";
  before: string | null;
  after: string | null;
};

/** A wish you are still buying, possibly rewritten since you reserved it. */
export type ActiveItem = {
  kind: "active";
  key: string;
  wish: ClaimedWish;
  /**
   * Also reachable as `wish.owner.name`. Named alongside the cancelled half's
   * copy so both rows render through one code path rather than two that drift.
   */
  ownerName: string;
  /** Null unless the owner rewrote it after you reserved it. */
  change: { noticeId: string; fields: WishChange[] } | null;
};

/** A wish you were buying that the owner deleted. */
export type CancelledItem = {
  kind: "cancelled";
  key: string;
  wish: Displayable;
  ownerName: string;
  noticeId: string;
};

/**
 * A row on "Čo kupujem".
 *
 * Discriminated the way `WishListView` is, because the two halves mean
 * different things: one is a wish that still exists, the other is a message
 * about one that does not. They deliberately share field names and shapes so
 * the page renders them with a single `WishRow`.
 *
 * Note which way this information travels. Everything here is built for the
 * person doing the buying, from a table the list's owner never reads; nothing on
 * an owner's code path may ever construct one of these.
 */
export type BuyingItem = ActiveItem | CancelledItem;

export type ActionResult = { ok: true } | { ok: false; error: string };
