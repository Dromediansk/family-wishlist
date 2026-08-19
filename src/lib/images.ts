/**
 * The vocabulary of a wish photo: what counts as one, how big it may be, and
 * how its stored path maps back to a content type and a cache token.
 *
 * Pure and DOM-free on purpose — the browser resizer, the Server Action and the
 * route handler all read the same rules from here, and the rules are unit
 * tested without a canvas, a bucket or a database (images.test.ts).
 *
 * docs/content/wishes.md#photos
 */

/**
 * The three types stored, and the bucket's own `allowed_mime_types` in
 * supabase/config.toml.
 *
 * `accept="image/*"` on the field is deliberately wider than this, so a HEIC
 * from an iPhone can still be picked — the browser re-encodes it to one of these
 * before anything is sent.
 */
export type PhotoMime = "image/webp" | "image/jpeg" | "image/png";

/** Matches the bucket's own limit, so a rejection is the same size either way. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** The longest edge the browser downscales to before uploading. */
export const MAX_PHOTO_EDGE = 1200;

const EXTENSIONS: Record<PhotoMime, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Every spelling the stored path may carry, back to its content type. */
const CONTENT_TYPES: Record<string, PhotoMime> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * The box `width`x`height` fits into, at most `max` on its longest edge, with
 * the aspect ratio kept. Never enlarges: a small screenshot stays its own size
 * rather than being blown up into a blurry one.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };

  const scale = max / longest;
  return {
    // At least one pixel each way — a 4000x1 panorama must not scale to zero.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * What the bytes actually are, from their leading magic numbers.
 *
 * The `type` the browser puts on a File is a claim, not evidence: a Server
 * Action is reachable by direct POST, so anything could arrive labelled as a
 * PNG. This is the only thing allowed to decide, and everything it does not
 * recognise is refused.
 */
export function sniffImageType(bytes: Uint8Array): PhotoMime | null {
  if (startsWith(bytes, 0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return "image/png";
  }
  if (startsWith(bytes, 0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  // "RIFF" then a four-byte length, then "WEBP".
  if (
    startsWith(bytes, 0, 0x52, 0x49, 0x46, 0x46) &&
    startsWith(bytes, 8, 0x57, 0x45, 0x42, 0x50)
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Whether `bytes` carries `signature` at `offset`. Short input needs no separate
 * length guard: an index past the end reads `undefined`, which is no byte.
 */
function startsWith(
  bytes: Uint8Array,
  offset: number,
  ...signature: number[]
): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** The file extension a sniffed type is stored under. */
export function extensionFor(mime: PhotoMime): string {
  return EXTENSIONS[mime];
}

/**
 * The `Content-Type` a stored path is served with — looked up from a whitelist
 * rather than echoed back, so the response header can only ever be one of three
 * image types whatever ends up in the column.
 */
export function contentTypeFor(path: string): PhotoMime | null {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return null;
  return CONTENT_TYPES[path.slice(dot + 1).toLowerCase()] ?? null;
}

/**
 * The `?v=` token for a photo's URL. Every upload gets a fresh random file name,
 * so this changes whenever the picture does — which is what lets the route
 * answer with a year-long `immutable` cache and still never show a stale photo.
 */
export function photoVersion(photoPath: string | null): string | null {
  if (!photoPath) return null;

  const name = photoPath.slice(photoPath.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const stem = dot === -1 ? name : name.slice(0, dot);
  return stem === "" ? null : stem;
}
