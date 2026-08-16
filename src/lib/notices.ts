import type {
  ActiveItem,
  BuyingItem,
  CancelledItem,
  ClaimedWish,
  WishChange,
} from "@/lib/types";

/**
 * Pure notice -> "Čo kupujem" row mapper. Free of any Supabase or Next.js import
 * so it can be unit tested directly (see notices.test.ts), matching wishes.ts
 * and members.ts.
 *
 * A notice exists because an owner deleted or rewrote a wish somebody had
 * already reserved. It is written by a trigger (see
 * supabase/migrations/0004_claim_notices.sql) and read on exactly one screen, by
 * exactly the person it is addressed to.
 */

export const NOTICE_COLUMNS =
  "id, kind, owner_name, wish_id, old_title, old_description, old_url, new_title, new_description, new_url, created_at";

export type NoticeRow = {
  id: string;
  kind: "deleted" | "edited";
  owner_name: string;
  wish_id: string | null;
  old_title: string;
  old_description: string | null;
  old_url: string | null;
  /** Null throughout when the wish was deleted rather than edited. */
  new_title: string | null;
  new_description: string | null;
  new_url: string | null;
  created_at: string;
};

/** Which fields the buyer is shown a before/after for, and in what order. */
const COMPARED = [
  ["title", "old_title", "new_title"],
  ["description", "old_description", "new_description"],
  ["url", "old_url", "new_url"],
] as const;

/**
 * What moved between the version somebody reserved and the version on the list
 * now.
 *
 * `old_*` is the wish as it was when they claimed it, not as of the previous
 * edit — repeat edits coalesce onto one notice in the database — so this stays
 * a comparison against what the buyer actually agreed to buy.
 */
function changesIn(notice: NoticeRow): WishChange[] {
  const changes: WishChange[] = [];

  for (const [field, oldKey, newKey] of COMPARED) {
    const before = notice[oldKey];
    const after = notice[newKey];
    if (before !== after) changes.push({ field, before, after });
  }

  return changes;
}

/** Newest first. ISO-8601 sorts correctly as a plain string. */
function newestFirst(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

/**
 * Everything the current member is buying, plus anything that happened to it.
 *
 * This function is the single authority on the order of that screen — it sorts
 * both halves rather than inheriting either from a query's ORDER BY, so the
 * ordering the tests pin is the ordering the page renders. Rows needing a
 * decision come first: cancellations, then wishes that were rewritten, then the
 * claims nobody has touched.
 *
 * An `edited` notice with no matching claim is dropped rather than rendered.
 * The database removes those itself when a wish is deleted or released, so one
 * showing up here means something raced; a row about a gift you are no longer
 * buying is worse than no row. (The header's badge counts stored rows, so in
 * that should-not-happen case it can read one higher than this screen shows.)
 */
export function toBuyingItems(
  claimed: ClaimedWish[],
  notices: NoticeRow[],
): BuyingItem[] {
  const edits = new Map<string, NoticeRow>();
  const deleted: NoticeRow[] = [];

  for (const notice of notices) {
    if (notice.kind === "deleted") deleted.push(notice);
    else if (notice.wish_id) edits.set(notice.wish_id, notice);
  }

  const cancelled: CancelledItem[] = deleted
    .sort((a, b) => newestFirst(a.created_at, b.created_at))
    .map((notice) => ({
      kind: "cancelled",
      key: notice.id,
      wish: {
        title: notice.old_title,
        description: notice.old_description,
        url: notice.old_url,
      },
      ownerName: notice.owner_name,
      noticeId: notice.id,
    }));

  const changed: ActiveItem[] = [];
  const untouched: ActiveItem[] = [];

  for (const wish of [...claimed].sort((a, b) =>
    newestFirst(a.claimedAt ?? "", b.claimedAt ?? ""),
  )) {
    const notice = edits.get(wish.id);
    const fields = notice ? changesIn(notice) : [];

    const item: ActiveItem = {
      kind: "active",
      key: wish.id,
      wish,
      ownerName: wish.owner.name,
      // A notice recording no visible difference leaves nothing to dismiss.
      change: notice && fields.length > 0 ? { noticeId: notice.id, fields } : null,
    };

    (item.change ? changed : untouched).push(item);
  }

  return [...cancelled, ...changed, ...untouched];
}
