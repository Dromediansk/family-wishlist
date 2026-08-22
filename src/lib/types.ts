import type { GroupId, MembershipId, UserId } from "@/lib/ids";

export type Role = "admin" | "member";

/** Narrow a `role` column into `Role`. Anything unrecognised is the lesser one. */
export function toRole(value: string): Role {
  return value === "admin" ? "admin" : "member";
}

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
 * An owner's own wish, plus which of their groups it is tagged visible in.
 *
 * The full tag list, because only the owner ever chooses them and their own
 * list is unscoped. Every other reader whose query is scoped to one group gets
 * no tags at all — they would say nothing that reader did not already know;
 * `ClaimedWish` is the one exception, and carries a narrower set.
 * `getWishListFor` drops tags naming a group the owner has since left, so these
 * are always live. docs/content/wishes.md#reading-a-list
 */
export type TaggedWish = OwnerWish & { groupIds: GroupId[] };

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

/**
 * A wish the current member has claimed, with whose list it came from and which
 * groups it reaches.
 *
 * `groupIds` is narrower than `TaggedWish`'s: only the tags naming a group the
 * viewer AND the owner both stand in right now. `/buying` spans every group, so
 * unlike every other non-owner view the tags do tell the reader something — but
 * a tag only one of the two reaches is not theirs to be shown, and
 * `getClaimedBy` never puts it here.
 * docs/content/claiming.md#what-im-buying
 */
export type ClaimedWish = OwnerWish & {
  owner: PeerUser;
  groupIds: GroupId[];
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
  | { viewerIsOwner: true; wishes: TaggedWish[] }
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

/**
 * What a control actually gets back. An action that navigates away resolves
 * with nothing, so the result has to be checked before it is read.
 * docs/content/ui-patterns.md#an-action-that-navigates-away-resolves-with-nothing
 */
export type ActionOutcome = ActionResult | undefined;

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

/**
 * A viewer inside one group. Required by everything group-scoped.
 *
 * `groupName` rides along because the membership row that proves the context
 * comes from a `group_id not null references groups (id)`, whose own `name` is
 * `not null` too: a proven membership always has a named group, so a screen that
 * wants the name never has to look it up or cope with its absence.
 */
export type GroupContext = Viewer & {
  groupId: GroupId;
  groupName: string;
  membershipId: MembershipId;
  role: Role;
};

/**
 * One invite link into a group. `createdBy` is a `MembershipId`, never a
 * `UserId` — the composite foreign key `invites_creator_in_group` enforces the
 * same thing in the database. docs/content/groups.md#invites
 */
export type Invite = {
  id: string;
  groupId: GroupId;
  createdBy: MembershipId;
  token: string;
  expiresAt: string | null;
  /** Null means unlimited. */
  maxUses: number | null;
  uses: number;
  revokedAt: string | null;
  createdAt: string;
};

/** An invite as the admin's full list on `/family` shows it — whoever made it. */
export type InviteWithCreator = Invite & { createdByName: string };
