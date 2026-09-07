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

/** Names a title under `landing.mock.wishes`, and is the wish's whole identity:
    the row id derives from it in `toMockDisplayable`. A union, not a string, so
    both the catalogue lookup and `CLAIMED_MOCK_KEY` are checked by the
    compiler. */
export type MockWishKey = "book" | "socks" | "mug";

export const MOCK_WISHES: readonly MockWishKey[] = ["book", "socks", "mug"];

/**
 * The wish the whole story is told through: reserved in beat two, absent from
 * the owner's side in beat three, and the badge that fades out of the hero. One
 * key rather than a flag on each row, so the illustrations cannot come to
 * disagree about which wish is taken. Typed as `MockWishKey`, so naming a wish
 * that is not on the list is a compile error rather than something a test has
 * to catch.
 */
export const CLAIMED_MOCK_KEY: MockWishKey = "socks";

/**
 * The wish being typed in beat one's form.
 *
 * Not `socks`, even though it is the wish the rest of the story follows: the
 * real field's placeholder is `wishes.form.titlePlaceholder`, "napr. Vlnené
 * ponožky, veľkosť 42", so a socks title would read as a placeholder nobody has
 * filled in yet rather than as something Zuzana wrote.
 */
export const WRITTEN_MOCK_KEY: MockWishKey = "book";

/** Names a group under `landing.mock.groups`. A union for the same reason as
    `MockWishKey`: the catalogue lookup and `TICKED_MOCK_GROUPS` are both
    checked by the compiler. */
export type MockGroupKey = "family" | "colleagues" | "cabin";

export const MOCK_GROUPS: readonly MockGroupKey[] = [
  "family",
  "colleagues",
  "cabin",
];

/**
 * Which of them beat one shows ticked. Two rather than one: one tick shows
 * that a wish is put somewhere, two show that it can be in more than one place
 * at once — which is the reason the real picker is checkboxes and not a
 * dropdown, and the half of the beat's sentence the old illustration left out.
 */
export const TICKED_MOCK_GROUPS: readonly MockGroupKey[] = [
  "family",
  "colleagues",
];

/** Which of the three fake screens a beat shows. */
export type MockVariant = "form" | "family" | "split";

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
  { key: "write", side: "end", mock: "form", layout: "beside" },
  { key: "reserve", side: "start", mock: "family", layout: "beside" },
  { key: "secret", mock: "split", layout: "full" },
];

/**
 * A wish key plus its translated title, in the shape `WishRow` takes.
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
  key: MockWishKey,
  title: string,
): Displayable {
  return {
    id: `mock-${key}`,
    title,
    description: null,
    url: null,
    photo: null,
  };
}
