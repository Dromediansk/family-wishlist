import type { GroupId, MembershipId, UserId } from "@/lib/ids";

export type Role = "admin" | "member";

/** One person in one group. `id` is the membership, never the account. */
export type Member = {
  id: MembershipId;
  name: string;
  role: Role;
  createdAt: string;
};

/**
 * A member carrying both of their ids. `id` addresses the membership, which is
 * what an admin control edits; `userId` addresses the account, which is what a
 * list link and every visibility check take. Conflating them is a type error.
 */
export type MemberWithCount = Member & {
  userId: UserId;
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

/**
 * What a viewer is told about a reservation.
 *
 * `taken` has no name to render, which is the point: a claim made in one group
 * must not name a stranger to another. The union is the enforcement — a
 * component handed a `taken` claim cannot reach for `by`.
 * docs/content/privacy-rule.md#where-the-rule-is-enforced
 */
export type ClaimView =
  | { kind: "free" }
  | { kind: "taken"; at: string }
  | { kind: "taken-by"; at: string; by: { id: UserId; name: string } };

/** A wish as shown to everyone except the owner: claim status included. */
export type ViewerWish = OwnerWish & { claim: ClaimView };

/** Somebody the viewer shares a group with, named for the screen they are on. */
export type PeerUser = {
  id: UserId;
  name: string;
};

/** A wish the current member has claimed, with whose list it came from. */
export type ClaimedWish = OwnerWish & {
  owner: PeerUser;
};

/**
 * A gift that was handed over. Both names are snapshots taken at that moment,
 * so removing either person leaves the record readable — and the giver's name
 * is here on purpose: the claim it came from is over.
 * docs/content/privacy-rule.md#when-the-secret-ends
 */
export type FulfilledWish = Displayable & {
  ownerName: string;
  giverName: string;
  fulfilledAt: string;
};

/** Discriminated so a component can never render the wrong view by accident. */
export type WishListView =
  | { viewerIsOwner: true; wishes: OwnerWish[] }
  | { viewerIsOwner: false; wishes: ViewerWish[] };

/**
 * Everything `WishRow` displays. The narrowing is the point: handed a
 * `ViewerWish`, the row still cannot reach `claim` through this type.
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

/** One of the viewer's groups, as the switcher and `preferredName` see it. */
export type GroupRef = {
  id: GroupId;
  name: string;
  role: Role;
};

/**
 * Who is looking, and everyone they are allowed to see.
 *
 * `peers` always contains the viewer's own id, even when they belong to no
 * group at all — `peer_user_ids` derives self-membership from a join and
 * returns nothing for a groupless user, and a `peers` set missing its own
 * owner would lock them out of their own list.
 *
 * `groups` is ordered by the viewer's own `memberships.created_at`, ascending.
 * `preferredName` and the switcher both depend on that order.
 */
export type Viewer = {
  userId: UserId;
  peers: ReadonlySet<UserId>;
  groups: readonly GroupRef[];
};

/** A viewer inside one group. Required by everything group-scoped. */
export type GroupContext = Viewer & {
  groupId: GroupId;
  membershipId: MembershipId;
  role: Role;
};
