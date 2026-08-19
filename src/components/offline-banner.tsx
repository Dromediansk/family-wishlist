"use client";

import { useOffline } from "next/offline";
import { WifiOffIcon } from "lucide-react";

/**
 * Shown while the phone cannot reach the server. Next holds and replays the
 * pending navigation or action, so nothing is lost — this explains why a tap
 * looks like it did nothing.
 */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-destructive text-destructive-foreground mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
    >
      <WifiOffIcon className="size-5 shrink-0" />
      Bez pripojenia. Zmeny sa odošlú, keď sa sieť vráti.
    </div>
  );
}
