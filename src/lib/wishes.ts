import { photoVersion } from "@/lib/images";
import type { ClaimedWish, OwnerWish, ViewerWish } from "@/lib/types";

/**
 * Pure row -> view mappers, free of Supabase and Next.js imports so the privacy
 * rule can be unit tested directly (wishes.test.ts).
 */

/** Columns selected when reading a list for its own owner. */
export const OWNER_WISH_COLUMNS =
  "id, title, description, url, photo_path, created_at";

/** Columns selected when reading someone else's list. */
export const VIEWER_WISH_COLUMNS = `${OWNER_WISH_COLUMNS}, claimed_at, claimer:claimed_by (id, name)`;

export type OwnerWishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  photo_path: string | null;
  created_at: string;
};

type ClaimerRelation = { id: string; name: string } | null;

export type ViewerWishRow = OwnerWishRow & {
  claimed_at: string | null;
  /** PostgREST widens an embedded one-to-one relation to an array. Accept both. */
  claimer: ClaimerRelation | ClaimerRelation[];
};

export type ClaimedWishRow = OwnerWishRow & {
  owner: { id: string; name: string } | { id: string; name: string }[];
};

function firstOrNull<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

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
  row: { claimed_by: string | null } | null,
  operation: "delete" | "update",
): { error: string; final: true } {
  const messages = REFUSALS[operation];
  return {
    error: row?.claimed_by != null ? messages.reserved : messages.notYours,
    final: true,
  };
}
