"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { LIVE_EVENT, LIVE_TOPIC } from "@/lib/live";

/**
 * Keeps every open tab in step with the database.
 *
 * Listens for the content-free "something changed" ping sent by the Server
 * Actions (see `src/lib/realtime.ts`) and answers it with `router.refresh()`.
 * That re-runs the Server Components for the current route with this visitor's
 * cookie, so the per-viewer claim redaction is re-applied on the server and no
 * wish data ever has to travel over the socket.
 *
 * `router.refresh()` merges the new RSC payload without discarding client
 * state, so an open dialog and its half-typed input survive an update landing.
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
  const router = useRouter();

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = false;
    let everLive = false;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
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
  }, [router]);

  return null;
}
