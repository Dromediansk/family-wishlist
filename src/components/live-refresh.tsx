"use client";

import { startTransition, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { syncFromLive } from "@/app/actions/live";
import { LIVE_EVENT, LIVE_TOPIC } from "@/lib/live";

/**
 * Keeps every open tab in step: listens for the content-free ping and answers it
 * with `syncFromLive`. Never `router.refresh()`, which reaches the current route
 * only. docs/content/live-updates.md
 */

/** A burst of writes should cost one re-render, not one each. */
const DEBOUNCE_MS = 250;

/** How often to catch up while the socket is down. Unused while it's healthy. */
const DISCONNECTED_POLL_MS = 30_000;

/**
 * One client for the lifetime of the page, not one per effect run —
 * `removeChannel` unsubscribes the channel but leaves the socket, so a
 * per-effect client accumulates sockets across React's double-invoked effects.
 */
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Background tabs are the normal case here, and browsers throttle timers
    // hard enough to starve the heartbeat. A worker keeps it ticking.
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
    // At most one syncFromLive outstanding. Without it the 30s deaf-poll would
    // queue one action per tick while offline and fire the pile at reconnect. A
    // ping arriving mid-flight is dropped; the next one picks it up.
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
            // Cosmetic — the deaf-poll and the staleTimes ceiling catch up.
            // Logged anyway: a permanently failing sync is invisible otherwise.
            console.warn("Live sync failed:", error);
          } finally {
            // Runs even on rejection, so a failure cannot wedge the guard shut.
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
        // Re-joining after a drop means we were deaf; the first join does not,
        // since the page was just server-rendered.
        if (live && everLive) refresh();
        if (live) everLive = true;
      });

    /**
     * Only while the socket is down. Refreshing on every tab switch would double
     * the work for a single change — the ping already refreshed this tab.
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
      // Leaves the shared client connected, ready for the next mount.
      void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
