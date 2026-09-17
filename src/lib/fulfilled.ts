import type { FulfilledWish } from "@/lib/types";

/**
 * Pure row -> view mapping for the two history pages, free of Supabase and
 * Next.js imports so it can be unit tested directly (fulfilled.test.ts).
 */

/** Columns selected by both history queries. The ids are used only in WHERE. */
export const FULFILLED_WISH_COLUMNS =
  "id, title, description, url, owner_name, giver_name, group_names, fulfilled_at";

export type FulfilledWishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  owner_name: string;
  giver_name: string;
  group_names: string[] | null;
  fulfilled_at: string;
};

/** Both names survive on purpose; see the type. */
export function toFulfilledWish(row: FulfilledWishRow): FulfilledWish {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    // A handed-over gift keeps no picture: `fulfil_wish` deletes the wish the
    // photo hung off, and this row's id addresses no wish for the route to
    // serve. docs/decisions/wishes-claims-history.md
    photo: null,
    ownerName: row.owner_name,
    giverName: row.giver_name,
    // `?? []` is for the records written before 0010 added the column, not for
    // its default: nothing can be recovered for those, so they carry no tag.
    groupNames: snapshotGroupNames(row),
    fulfilledAt: row.fulfilled_at,
  };
}

/**
 * The same record as the activity feed reads it: the two id columns, which it
 * needs for `.or()` and for "which history page does this row link to", and
 * none of the body text a dropdown row has no room for.
 *
 * Beside `FULFILLED_WISH_COLUMNS` rather than inline in `data/activity.ts`, so
 * every `fulfilled_wishes` projection stays in the file that owns them.
 */
export const FULFILLED_ACTIVITY_COLUMNS =
  "id, owner_id, giver_id, owner_name, giver_name, title, group_names, fulfilled_at";

export type FulfilledActivityRow = {
  id: string;
  owner_id: string | null;
  giver_id: string | null;
  owner_name: string;
  giver_name: string;
  title: string;
  group_names: string[] | null;
  fulfilled_at: string;
};

/** The pre-0010 repair, shared so the two readers cannot disagree about it. */
export function snapshotGroupNames(row: { group_names: string[] | null }): string[] {
  return row.group_names ?? [];
}
