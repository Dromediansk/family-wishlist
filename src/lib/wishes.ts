import type { ClaimedWish, OwnerWish, ViewerWish } from "@/lib/types";

/**
 * Pure row -> view mappers. Kept free of any Supabase or Next.js import so the
 * surprise rule can be unit tested directly (see wishes.test.ts).
 */

/** Columns selected when reading a list for its own owner. */
export const OWNER_WISH_COLUMNS = "id, title, description, url, created_at";

/** Columns selected when reading someone else's list. */
export const VIEWER_WISH_COLUMNS = `${OWNER_WISH_COLUMNS}, claimed_at, claimer:claimed_by (id, name)`;

export type OwnerWishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  created_at: string;
};

type ClaimerRelation = { id: string; name: string } | null;

export type ViewerWishRow = OwnerWishRow & {
  claimed_at: string | null;
  /**
   * PostgREST returns an embedded one-to-one relation as an object, but its
   * generated types often widen it to an array. Accept both and normalize.
   */
  claimer: ClaimerRelation | ClaimerRelation[];
};

export type ClaimedWishRow = OwnerWishRow & {
  claimed_at: string | null;
  owner: { id: string; name: string } | { id: string; name: string }[];
};

function firstOrNull<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * The owner's view. Builds a fresh object with an explicit field list rather
 * than spreading the row, so a claim column can never ride along even if the
 * query is later changed to select more than it should.
 */
export function toOwnerWish(row: OwnerWishRow): OwnerWish {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    createdAt: row.created_at,
  };
}

/** Everyone else's view: claim status included. */
export function toViewerWish(row: ViewerWishRow): ViewerWish {
  const claimer = firstOrNull(row.claimer);
  return {
    ...toOwnerWish(row),
    claimedBy: claimer ? { id: claimer.id, name: claimer.name } : null,
    claimedAt: claimer ? row.claimed_at : null,
  };
}

/** The "things I'm buying" view. */
export function toClaimedWish(row: ClaimedWishRow): ClaimedWish {
  const owner = firstOrNull(row.owner);
  return {
    ...toOwnerWish(row),
    owner: owner ? { id: owner.id, name: owner.name } : { id: "", name: "?" },
    claimedAt: row.claimed_at,
  };
}
