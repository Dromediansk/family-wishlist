import type { UserId } from "@/lib/ids";
import { photoVersion } from "@/lib/images";
import type { ClaimedWish, OwnerWish, ViewerWish } from "@/lib/types";
import { revealClaimer } from "@/lib/visibility";

/**
 * Pure row -> view mappers, free of Supabase and Next.js imports so the privacy
 * rule can be unit tested directly (wishes.test.ts).
 */

/** Columns selected when reading a list for its own owner. */
export const OWNER_WISH_COLUMNS =
  "id, title, description, url, photo_path, created_at";

export type OwnerWishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  photo_path: string | null;
  created_at: string;
};

/** Columns selected when reading someone else's list. */
export const VIEWER_WISH_COLUMNS = `${OWNER_WISH_COLUMNS}, claimed_at, claimed_by_user_id`;

/*
 * The two id columns arrive branded: `src/lib/data/wishes.ts` reads them from
 * columns that reference app_users, and vouches for them in the one cast at
 * that boundary. Nothing downstream re-brands a raw string.
 */
export type ViewerWishRow = OwnerWishRow & {
  claimed_at: string | null;
  claimed_by_user_id: UserId | null;
};

export type ClaimedWishRow = OwnerWishRow & {
  owner_user_id: UserId;
};

/**
 * The owner's view. Explicit field list rather than a spread, so a claim column
 * cannot ride along if the query is later widened.
 */
export function toOwnerWish(row: OwnerWishRow): OwnerWish {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    photo: row.photo_path,
    createdAt: row.created_at,
  };
}

/**
 * Everyone else's view.
 *
 * The claimer's name is resolved by the caller and handed in, rather than
 * embedded in the query: a name is a per-group fact, so it cannot come from a
 * PostgREST join on app_users. `names` is built by `getPeerNames`.
 */
export function toViewerWish(
  row: ViewerWishRow,
  peers: ReadonlySet<UserId>,
  names: ReadonlyMap<UserId, string>,
): ViewerWish {
  const base = toOwnerWish(row);
  const claimer = row.claimed_by_user_id;

  // claim_consistent guarantees both or neither, so a half-claim is corrupt
  // data rather than a state to render.
  if (claimer === null || row.claimed_at === null) {
    return { ...base, claim: { kind: "free" } };
  }

  if (!revealClaimer(peers, claimer)) {
    return { ...base, claim: { kind: "taken", at: row.claimed_at } };
  }

  return {
    ...base,
    claim: {
      kind: "taken-by",
      at: row.claimed_at,
      by: { id: claimer, name: names.get(claimer) ?? "?" },
    },
  };
}

/** The "things I'm buying" view. */
export function toClaimedWish(
  row: ClaimedWishRow,
  names: ReadonlyMap<UserId, string>,
): ClaimedWish {
  const owner = row.owner_user_id;
  return {
    ...toOwnerWish(row),
    owner: { id: owner, name: names.get(owner) ?? "?" },
  };
}

/**
 * Where to fetch a wish's photo, or null if it has none.
 *
 * The route is addressed by wish id rather than by object key, so the key never
 * has to be trusted from a URL. The `?v=` token is the file name, which is fresh
 * on every upload — that is what lets the route cache for a year and still never
 * hand back last week's picture. docs/content/wishes.md#photos
 */
export function wishPhotoUrl(wish: {
  id: string;
  photo: string | null;
}): string | null {
  const version = photoVersion(wish.photo);
  return version ? `/wish-photo/${wish.id}?v=${version}` : null;
}

/** Every way an owner's delete or edit can be turned down, in one place. */
const REFUSALS = {
  delete: {
    reserved: "Toto želanie už má niekto rezervované, preto ho nemôžeš vymazať.",
    notYours: "Mazať môžeš len vlastné želania.",
  },
  update: {
    reserved: "Toto želanie už má niekto rezervované, preto ho nemôžeš upraviť.",
    notYours: "Upravovať môžeš len vlastné želania.",
  },
} as const;

/**
 * Why an owner's delete or edit matched no rows: it isn't theirs, or it is
 * reserved. Only the wording differs, and it never says by whom. `row` of null
 * means nothing matched on id and owner at all.
 *
 * Always `final` — only the holder can release it.
 * docs/content/privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen
 */
export function refusalFor(
  row: { claimed_by_user_id: string | null } | null,
  operation: "delete" | "update",
): { error: string; final: true } {
  const messages = REFUSALS[operation];
  return {
    error:
      row?.claimed_by_user_id != null ? messages.reserved : messages.notYours,
    final: true,
  };
}
