/**
 * What the landing page shows, as data.
 *
 * The same shape as `src/lib/legal.ts`: every sentence a reader sees lives in
 * the message catalogues, and this file holds only the keys that tie the two
 * together — so a beat added here and forgotten in one language is a test
 * failure rather than a blank half of the page.
 *
 * Nothing here is read from the database, and nothing here may ever be. `/` is
 * the one page with no session to check, and these are illustrations of the
 * app rather than the app. Wiring any of it to a real query would be the way
 * an owner's claim reached the one screen that cannot refuse it.
 * docs/decisions/privacy-rule.md
 */

import type { Displayable } from "@/lib/types";

/** Names a title under `landing.mock.wishes`. A union, not a string, so the
    catalogue lookup that reads it is checked against `Messages`. */
export type MockWishKey = "book" | "socks" | "mug";

/** One wish in an illustration. `key` names its title under `landing.mock.wishes`. */
export type MockWishSpec = {
  id: string;
  key: MockWishKey;
};

export const MOCK_WISHES: readonly MockWishSpec[] = [
  { id: "mock-book", key: "book" },
  { id: "mock-socks", key: "socks" },
  { id: "mock-mug", key: "mug" },
];

/**
 * The wish the whole story is told through: reserved in beat two, absent from
 * the owner's side in beat three, and the badge that fades out of the hero. One
 * id rather than a flag on each row, so the illustrations cannot come to
 * disagree about which wish is taken.
 */
export const CLAIMED_MOCK_ID = "mock-socks";

/** Which of the three fake screens a beat shows. */
export type MockVariant = "owner" | "family" | "split";

/**
 * The three beats, in order. `layout` says how the beat is drawn:
 * `beside` puts the illustration next to the prose from `sm:` up, alternating
 * with `side`; `full` gives the illustration the whole content measure and
 * drops `side` — a beat with nothing beside it has no side to be the start or
 * end of, and the type says so by not carrying the field at all.
 */
export type BeatSpec =
  | {
      key: "write" | "reserve" | "secret";
      mock: MockVariant;
      layout: "beside";
      side: "start" | "end";
    }
  | {
      key: "write" | "reserve" | "secret";
      mock: MockVariant;
      layout: "full";
    };

export const STORY_BEATS: readonly BeatSpec[] = [
  { key: "write", side: "end", mock: "owner", layout: "beside" },
  { key: "reserve", side: "start", mock: "family", layout: "beside" },
  { key: "secret", mock: "split", layout: "full" },
];

/**
 * A spec plus its translated title, in the shape `WishRow` takes.
 *
 * `photo` is always null, and that is load-bearing rather than lazy:
 * `wishPhotoUrl` would turn a non-null value into `/wish-photo/mock-…`, and
 * that route serves real files belonging to real people.
 *
 * `url` is always null for the same kind of reason: an illustration must not
 * contain a live link out of the page — `WishRow` renders a real focusable
 * `<a href target="_blank">` for a wish that carries one — so the field is
 * forced here rather than left to the data.
 */
export function toMockDisplayable(
  spec: MockWishSpec,
  title: string,
): Displayable {
  return {
    id: spec.id,
    title,
    description: null,
    url: null,
    photo: null,
  };
}
