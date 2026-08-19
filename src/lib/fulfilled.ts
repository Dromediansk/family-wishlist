import type { FulfilledWish } from "@/lib/types";

/**
 * Pure row -> view mapping for the two history pages, free of Supabase and
 * Next.js imports so it can be unit tested directly (fulfilled.test.ts).
 */

/** Columns selected by both history queries. The ids are used only in WHERE. */
export const FULFILLED_WISH_COLUMNS =
  "id, title, description, url, owner_name, giver_name, fulfilled_at";

export type FulfilledWishRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  owner_name: string;
  giver_name: string;
  fulfilled_at: string;
};

/** Both names survive on purpose; see the type. */
export function toFulfilledWish(row: FulfilledWishRow): FulfilledWish {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    ownerName: row.owner_name,
    giverName: row.giver_name,
    fulfilledAt: row.fulfilled_at,
  };
}
