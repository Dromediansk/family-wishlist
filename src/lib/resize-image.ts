import "client-only";

import {
  MAX_PHOTO_EDGE,
  extensionFor,
  fitWithin,
  type PhotoMime,
} from "@/lib/images";

/**
 * Shrinks and re-encodes a picked photo in the browser, before it is ever sent.
 *
 * Not only a size optimisation. Re-encoding through a canvas is also what makes
 * a photo taken on an iPhone work at all — Safari decodes HEIC, which no server
 * here can, and what comes out the other side is a WebP. It drops EXIF with it,
 * so the GPS coordinates a phone writes into a photo never leave the device.
 *
 * Browsers apply `image-orientation: from-image` when drawing an `<img>`, so a
 * photo taken sideways is stored the way it was seen.
 *
 * docs/content/wishes.md#photos
 */

/** Enough for a wish, small enough to send on a phone's connection. */
const QUALITY = 0.82;

export async function resizeForUpload(file: File): Promise<File> {
  const image = await loadImage(file);

  try {
    const { width, height } = fitWithin(
      image.naturalWidth,
      image.naturalHeight,
      MAX_PHOTO_EDGE,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.drawImage(image, 0, 0, width, height);

    // WebP where it is understood, JPEG where it is not. `encode` answers null
    // rather than throwing for a format the browser cannot write.
    const encoded =
      (await encode(canvas, "image/webp")) ??
      (await encode(canvas, "image/jpeg"));
    if (!encoded) throw new Error("The image could not be encoded.");

    return encoded;
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

/**
 * The picked photo as something an `<img>` can show.
 *
 * A data URL rather than `URL.createObjectURL`, because a data URL is garbage
 * collected with the string that holds it. An object URL would have to be
 * revoked by hand, and every path that forgets — a re-pick, a removal, a closed
 * dialog — leaks the whole image for the life of the tab.
 */
export function previewSrc(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The file is not an image this browser can read."));
    };
    image.src = url;
  });
}

/** The canvas as one `mime` file, or null if this browser cannot write that. */
function encode(
  canvas: HTMLCanvasElement,
  mime: PhotoMime,
): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      // A browser that cannot write the type falls back to PNG rather than
      // failing, so the answer is only accepted when it is what was asked for.
      (blob) =>
        resolve(
          blob && blob.type === mime
            ? new File([blob], `photo.${extensionFor(mime)}`, { type: mime })
            : null,
        ),
      mime,
      QUALITY,
    );
  });
}
