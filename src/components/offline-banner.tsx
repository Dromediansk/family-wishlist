"use client";

import { useOffline } from "next/offline";
import { WifiOffIcon } from "lucide-react";

/**
 * Shown while the phone can't reach the server.
 *
 * Next holds any pending navigation or Server Action until the connection
 * returns and then replays it, so nothing is lost — this is here to explain why
 * a tap looks like it did nothing.
 */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-destructive text-destructive-foreground mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
    >
      <WifiOffIcon className="size-4 shrink-0" />
      Bez pripojenia. Zmeny sa odošlú, keď sa sieť vráti.
    </div>
  );
}
