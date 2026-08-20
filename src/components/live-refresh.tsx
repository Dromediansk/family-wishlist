"use client";

import { startTransition, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { syncFromLive } from "@/app/actions/live";
import type { GroupId } from "@/lib/ids";
import { channelFor, LIVE_EVENT } from "@/lib/live";

/**
 * Keeps every open tab in step: listens for the content-free ping on each of
 * the viewer's groups and answers it with `syncFromLive`. Never
 * `router.refresh()`, which reaches the current route only.
 * docs/content/live-updates.md
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

export function LiveRefresh({ groupIds }: { groupIds: readonly GroupId[] }) {
  // Re-subscribing on every re-render (a group write revalidates the whole
  // layout) would drop and reopen every channel for nothing — the dependency
  // below is this stable key, not the array reference.
  const key = groupIds.join(",");

  useEffect(() => {
    const supabase = getClient();
    if (!supabase || groupIds.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    // Which of the viewer's group channels are currently subscribed — a partial
    // drop still counts as deaf.
    const subscribed = new Set<number>();
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

    const channels = groupIds.map((groupId, index) =>
      supabase
        .channel(channelFor(groupId))
        .on("broadcast", { event: LIVE_EVENT }, refresh)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") subscribed.add(index);
          else subscribed.delete(index);
          live = subscribed.size === groupIds.length;
          // Re-joining after a drop means we were deaf; the first join does
          // not, since the page was just server-rendered.
          if (live && everLive) refresh();
          if (live) everLive = true;
        }),
    );

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
      for (const channel of channels) void supabase.removeChannel(channel);
    };
    // `key` is the stable serialization of `groupIds` — re-running on the
    // array reference itself would resubscribe every channel on every
    // unrelated re-render (a group write revalidates the whole layout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
