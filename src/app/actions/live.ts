"use server";

import { revalidatePath } from "next/cache";

/**
 * The browser's answer to the live ping: throw away everything this tab has
 * cached and re-render under its own cookie.
 *
 * Must be `revalidatePath`, not `router.refresh()` or `next/cache`'s
 * `refresh()` — both leave a cached `/` payload alive.
 *
 * The one Server Action that skips the CLAUDE.md checklist: no input, no table
 * read, no row written. There is nothing here for a caller check to protect,
 * so it takes none.
 *
 * **Safe only while nothing is cached server-side.** Adopt Cache Components and
 * an unauthenticated call becomes a global cache purge; the caller check goes
 * back in. docs/content/live-updates.md#syncfromlive-is-the-one-unauthorized-action
 */
export async function syncFromLive(): Promise<void> {
  revalidatePath("/", "layout");
}
