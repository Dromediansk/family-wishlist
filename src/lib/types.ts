export type Role = "admin" | "member";

/** docs/content/membership.md — everyone lands `pending` except the first. */
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
 * A card on the family grid. On your own card `availableCount` is *absent*, not
 * null — a free count beside your total would say in arithmetic that the rest
 * are taken. Splitting the union makes reaching for it a type error.
 * docs/content/privacy-rule.md#counting-on-the-family-grid
 */
export type MemberSummary = MemberWithCount &
  ({ viewerIsOwner: true } | { viewerIsOwner: false; availableCount: number });

/**
 * A member plus the fields only an admin may see. Separate from `Member` so
 * email addresses reach one screen rather than every member card.
 */
export type MemberAccount = Member & {
  status: MemberStatus;
  email: string | null;
};

/**
 * A wish as shown to the person whose list it is. Deliberately NO claim fields,
 * so a leak is a type error. docs/content/privacy-rule.md
 */
export type OwnerWish = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  /** The Storage object key, not a URL. `wishPhotoUrl` turns it into one. */
  photo: string | null;
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
 * Everything `WishRow` displays. The narrowing is the point: handed a
 * `ViewerWish`, the row still cannot reach `claimedBy` through this type.
 */
export type Displayable = Pick<
  OwnerWish,
  "id" | "title" | "description" | "url" | "photo"
>;

/**
 * What every Server Action returns. Expected failures are values, not throws.
 *
 * `final` means repeating the call cannot change the outcome, so the UI stops
 * offering the button. A validation message is not final; a reserved-wish
 * refusal is. docs/content/ui-patterns.md#a-refusal-ends-the-dialog
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; final?: boolean };

/** The failed half, for components that hold on to one to render it. */
export type ActionFailure = Extract<ActionResult, { ok: false }>;
