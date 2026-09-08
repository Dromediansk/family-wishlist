"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { DownloadIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
 *
 * A sheet pinned to the bottom of the viewport rather than a block at the foot
 * of the page, and deliberately not modal.
 * docs/decisions/ui-patterns.md#the-installable-app
 */
export function InstallPrompt() {
  const t = useTranslations("install");
  const promptId = useId();
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
    /*
     * Two elements: the outer one positions and carries the safe-area inset, the
     * inner one is the card. The padding between them is what holds the card off
     * the edges of the screen — flush against both, a bordered card reads as a
     * full-screen panel instead.
     *
     * `z-40` and no higher. `z-50` belongs to the dialog overlay, the dialog
     * panel and the dropdown menu, and a nudge has to pass under all three.
     *
     * `pointer-events-none` on the positioner, back on for the card: the gutter
     * is transparent but would still swallow taps meant for the page under it,
     * and nothing about this is modal.
     */
    <aside
      aria-labelledby={promptId}
      className="animate-in slide-in-from-bottom fade-in-0 pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] duration-300"
    >
      {/*
       * `bg-card`, not `bg-background`: this floats over the page rather than
       * sitting on it, and in dark mode the two tokens are a step apart — the
       * page's own ground would leave the card readable only by its border.
       * `rounded-xl border` is `Card`'s recipe for the same reason, but the
       * component itself is a padded column and this is a wrapping row.
       */}
      <div className="bg-card text-card-foreground pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm shadow-lg">
        {installEvent ? (
          <p
            id={promptId}
            className="text-muted-foreground min-w-[14rem] flex-1"
          >
            {t("prompt")}
          </p>
        ) : (
          <p
            id={promptId}
            className="text-muted-foreground flex min-w-[14rem] flex-1 items-center gap-2"
          >
            <ShareIcon className="size-5 shrink-0" />
            <span>{t("iosPrompt")}</span>
          </p>
        )}

        <div className="flex gap-2">
          {installEvent ? (
            <Button size="sm" onClick={install}>
              <DownloadIcon />
              {t("install")}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
