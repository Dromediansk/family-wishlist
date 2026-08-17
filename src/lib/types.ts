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
};

/** Discriminated so a component can never render the wrong view by accident. */
export type WishListView =
  | { viewerIsOwner: true; wishes: OwnerWish[] }
  | { viewerIsOwner: false; wishes: ViewerWish[] };

/**
 * Everything `WishRow` displays — and the narrowing is the point. Handed a
 * `ViewerWish` on someone else's list, the row cannot reach `claimedBy` or
 * `claimedAt` through this type, so it cannot render a claim by accident.
 */
export type Displayable = Pick<OwnerWish, "title" | "description" | "url">;

/**
 * What every Server Action returns. Expected failures are values, not throws.
 *
 * `final` means the same call will fail the same way however many times it is
 * repeated, so the UI should stop offering the button rather than leave one
 * that visibly does nothing. A validation message or a dropped connection is
 * not final; being refused a reserved wish is.
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; final?: boolean };

/** The failed half, for components that hold on to one to render it. */
export type ActionFailure = Extract<ActionResult, { ok: false }>;
