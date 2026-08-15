/**
 * The shared vocabulary of the live-update channel.
 *
 * Imported by both the server publisher (`src/lib/realtime.ts`) and the browser
 * subscriber (`src/components/live-refresh.tsx`), so the two can never drift
 * apart and silently stop talking to each other. Deliberately free of any
 * `server-only` import or Supabase dependency so both sides — and the tests —
 * can pull it in.
 *
 * The channel is a *public* Supabase Realtime channel, so anyone holding the
 * anon key can join it. That is acceptable only because of `LIVE_PAYLOAD`
 * below: there is nothing on the channel to overhear. (A private channel would
 * also stop strangers *sending* pings, but private broadcasts persist into the
 * partitioned `realtime.messages` table, and a project without today's
 * partition rejects them with "Missing messages partition". Not worth the
 * daily-maintenance failure mode for a family app.)
 */

export const LIVE_TOPIC = "family-wishlist";
export const LIVE_EVENT = "changed";

/**
 * What a ping carries: nothing.
 *
 * This empty object is the app's privacy rule expressed in code. Everything a
 * browser is allowed to see already depends on who is asking, and that decision
 * is made on the server by `getWishListFor`. A broadcast reaches every open tab
 * at once, including the tab of the person whose list just got claimed from —
 * so the moment this payload describes *what* changed, that owner can read it
 * out of devtools and the surprise is spoiled. Even a bare member id would do
 * it. The ping says only "ask the server again".
 */
export const LIVE_PAYLOAD: Record<string, never> = {};
