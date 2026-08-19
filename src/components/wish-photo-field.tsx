"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_PHOTO_BYTES } from "@/lib/images";
import { previewSrc, resizeForUpload } from "@/lib/resize-image";
import { cn } from "@/lib/utils";

/**
 * Three cases, not a nullable file: an edit has to be able to say "leave the old
 * photo alone" and "take it away" separately. On a new wish "unchanged" is
 * simply "no photo".
 */
export type WishPhotoChoice =
  | { kind: "unchanged" }
  | { kind: "clear" }
  | { kind: "set"; file: File };

type Props = {
  id: string;
  value: WishPhotoChoice;
  /** Where the wish's current photo lives, for an edit. */
  existingUrl?: string | null;
  onChange: (value: WishPhotoChoice) => void;
  disabled?: boolean;
};

/**
 * Picking a photo for a wish.
 *
 * `accept="image/*"` and deliberately **no** `capture` attribute: `capture`
 * opens the camera and takes the photo library away with it, and a screenshot
 * of a shop's page — the thing people most want to attach — lives in the
 * library. Without it a phone offers camera, library and files, and a desktop
 * offers the file picker or a drop.
 */
export function WishPhotoField({
  id,
  value,
  existingUrl = null,
  onChange,
  disabled = false,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: File; src: string } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * One name for "hands off", so the controls that only wait cannot drift
   * apart. The two picker buttons take `busy` as `loading` instead — they are
   * the ones doing the work, and only they carry the spinner.
   */
  const locked = disabled || busy;

  /*
   * What the field shows, derived rather than stored: the picked photo, the one
   * already on the wish, or nothing. The `preview.file === value.file` check is
   * what keeps a stale thumbnail off the screen if the form resets the choice
   * from outside.
   */
  const shown =
    value.kind === "set"
      ? preview?.file === value.file
        ? preview.src
        : null
      : value.kind === "clear"
        ? null
        : existingUrl;

  async function accept(file: File | undefined) {
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      // Shrunk and re-encoded here, so what travels is a few hundred KB of WebP
      // rather than a 12-megapixel HEIC the server could not read anyway.
      const resized = await resizeForUpload(file);

      if (resized.size > MAX_PHOTO_BYTES) {
        setError("Fotka je príliš veľká. Skús menší obrázok.");
        return;
      }

      setPreview({ file: resized, src: await previewSrc(resized) });
      onChange({ kind: "set", file: resized });
    } catch {
      setError("Fotku sa nepodarilo načítať. Skús iný obrázok.");
    } finally {
      setBusy(false);
      // Cleared so that picking the same file twice still counts as a change.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(event) => {
        // Without this the browser navigates to the dropped file instead.
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void accept(event.dataTransfer.files[0]);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-md border border-dashed p-3 transition-colors",
        dragging && "border-primary bg-secondary",
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={locked}
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {shown ? (
        <div className="flex items-center gap-3">
          {/*
           * A plain <img>: this is either a data: URL made moments ago in this
           * browser or the wish's own route, and neither has anything for the
           * image optimizer to do.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt=""
            className="size-20 shrink-0 rounded-md border object-cover"
          />
          <div className="flex flex-col items-start gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              loading={busy}
              onClick={() => input.current?.click()}
            >
              Vybrať inú
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={locked}
              onClick={() => {
                setError(null);
                setPreview(null);
                onChange({ kind: "clear" });
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              Odstrániť fotku
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            loading={busy}
            onClick={() => input.current?.click()}
          >
            <ImagePlusIcon />
            Vybrať fotku
          </Button>
          {/* Dragging is not a gesture a phone has, so the hint stays off it. */}
          <span className="text-muted-foreground hidden text-sm sm:inline">
            alebo sem presuň obrázok
          </span>
        </div>
      )}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
