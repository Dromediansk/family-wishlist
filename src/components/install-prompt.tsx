"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DownloadIcon, ShareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "install_prompt_dismissed";

/** Chrome's install event. Not in lib.dom yet, so it's typed here. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const neverChanges = () => () => {};

/**
 * Reads a browser-only value that never changes for the life of the page. SSR
 * and first hydration both see `false`, so there is nothing to mismatch.
 */
function useBrowserFlag(read: () => boolean) {
  return useSyncExternalStore(neverChanges, read, () => false);
}

/**
 * Nudge to add the app to the home screen. Two paths: Chrome fires
 * `beforeinstallprompt` and gives a real one-tap install, iOS Safari fires
 * nothing and the only way in is the share sheet.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const previouslyDismissed = useBrowserFlag(
    () => localStorage.getItem(DISMISSED_KEY) === "1",
  );
  // Already installed — this *is* the app.
  const isStandalone = useBrowserFlag(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );
  const isIOS = useBrowserFlag(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent),
  );

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    dismiss();
  }

  if (dismissed || previouslyDismissed || isStandalone) return null;
  if (!installEvent && !isIOS) return null;

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
      {installEvent ? (
        <p className="text-muted-foreground min-w-[14rem] flex-1">
          Nainštaluj si appku na plochu, otvorí sa ti ako každá iná.
        </p>
      ) : (
        <p className="text-muted-foreground flex min-w-[14rem] flex-1 items-center gap-2">
          <ShareIcon className="size-5 shrink-0" />
          <span>
            Pridaj si appku na plochu: ťukni na ikonu zdieľania a zvoľ „Add to
            Home Screen“.
          </span>
        </p>
      )}

      <div className="flex gap-2">
        {installEvent ? (
          <Button size="sm" onClick={install}>
            <DownloadIcon />
            Nainštalovať
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Teraz nie
        </Button>
      </div>
    </div>
  );
}
