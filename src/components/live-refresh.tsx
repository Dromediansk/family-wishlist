"use client";

import { startTransition, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { syncFromLive } from "@/app/actions/live";
import { LIVE_EVENT, LIVE_TOPIC } from "@/lib/live";

/**
 * Keeps every open tab in step with the database.
 *
 * Listens for the content-free "something changed" ping sent by the Server
 * Actions (see `src/lib/realtime.ts`) and answers it by calling `syncFromLive`,
 * whose whole body is `revalidatePath("/", "layout")`. That purges this tab's
 * Client Cache — every route it has visited, not only the one on screen — and
 * the action's response re-renders the current route with this visitor's
 * cookie, so the per-viewer claim redaction is re-applied on the server and no
 * wish data ever has to travel over the socket.
 *
 * `router.refresh()` used to do the second half of that, and cannot do the
 * first: it clears the Client Cache for the *current route only*. With
 * `staleTimes.dynamic` switched on in `next.config.ts`, a ping arriving while
 * the viewer sits on a wish list would refresh that list and leave the cached
 * family grid holding its pre-change counts — so tapping "Všetci" would land on
 * stale numbers, instantly, with no request to correct them.
 *
 * As with `router.refresh()` before it, the response is merged into the running
 * tree without discarding client state, so an open dialog and its half-typed
 * input survive an update landing.
 */

/** A burst of writes should cost one re-render, not one each. */
const DEBOUNCE_MS = 250;

/** How often to catch up while the socket is down. Unused while it's healthy. */
const DISCONNECTED_POLL_MS = 30_000;

/**
 * One Supabase client for the lifetime of the page, not one per effect run.
 *
 * Creating it inside the effect made a fresh client — with its own WebSocket and
 * its own auth instance — every time the effect re-ran, and `removeChannel` only
 * unsubscribes the channel, so the sockets accumulated. React runs effects twice
 * in development, and again on every hot reload, so this piled up quickly and
 * showed as "Multiple GoTrueClient instances detected in the same browser
 * context" in the console.
 */
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Browsers throttle timers in background tabs hard enough to starve the
    // socket's heartbeat, so a tab left open in the background drops off the
    // channel. Running the heartbeat in a web worker keeps it ticking — which
    // matters here, because background tabs are the normal case for this app.
    realtime: { worker: true },
  });

  return client;
}

export function LiveRefresh() {
  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = false;
    let everLive = false;
    // At most one syncFromLive outstanding at a time. Without this, the 30s
    // deaf-poll queues a fresh Server Action every tick it's down, and with
    // useOffline holding failed actions rather than rejecting them, a phone
    // left visible and offline for ten minutes would have ~20 of them fire at
    // once on reconnect — each a full route re-render with its own auth call
    // and queries. `router.refresh()` never had this problem: it queued
    // refresh *navigations*, of which only the last survives.
    let pending = false;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending) return;
        pending = true;
        startTransition(async () => {
          try {
            await syncFromLive();
          } catch (error) {
            // Cosmetic: the deaf-poll below and the staleTimes ceiling both
            // catch up. But say so — a permanently failing sync and a healthy
            // one look identical from the outside otherwise.
            console.warn("Live sync failed:", error);
          } finally {
            // Runs even if syncFromLive rejects, so a failure can't wedge the
            // guard shut. While offline, useOffline holds the pending action
            // rather than rejecting it, so this may not run until
            // reconnection — that's the point, one outstanding action rather
            // than a pile of them — but it does mean the guard stays closed
            // for the whole outage. It still opens the moment that action
            // settles, and the tab recovers from there: the next ping, the
            // next deaf-poll tick, or the visibilitychange catch-up will all
            // schedule a fresh one.
            pending = false;
          }
        });
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(LIVE_TOPIC)
      .on("broadcast", { event: LIVE_EVENT }, refresh)
      .subscribe((status) => {
        live = status === "SUBSCRIBED";
        // Re-joining after a drop means we were deaf for a while, so catch up.
        // The first join needs no refresh: the page was just server-rendered.
        if (live && everLive) refresh();
        if (live) everLive = true;
      });

    /**
     * Only worth doing while the socket is down.
     *
     * Refreshing on every tab switch looks harmless but doubles the work for a
     * single change: the ping already refreshed this tab in the background, and
     * coming back to look at it fired a second, identical render. While the
     * channel is subscribed, pings are arriving and there is nothing to catch
     * up on.
     */
    const catchUpIfDeaf = () => {
      if (document.visibilityState !== "visible") return;
      if (live) return;
      refresh();
    };

    document.addEventListener("visibilitychange", catchUpIfDeaf);
    const poll = setInterval(catchUpIfDeaf, DISCONNECTED_POLL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", catchUpIfDeaf);
      // Unsubscribes the channel but leaves the shared client connected, ready
      // for the next mount.
      void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
