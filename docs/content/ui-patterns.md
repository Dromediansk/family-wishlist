# UI patterns

The app is read by grandparents on phones. That is the brief, and most of what
follows is downstream of it.

## Language

**Every user-facing string is Slovak**, including validation messages.

Slovak counts take three forms — 1 želanie, 2–4 želania, 0 and 5+ želaní.
`wishCount()` in [`src/lib/utils.ts`](../../src/lib/utils.ts) is the only place
that decides which.

Names are collated with `Intl.Collator("sk")`, so Č sorts after C rather than
after Z.

## Dialogs

Three of them, in `add-wish-dialog.tsx` and `edit-wish-dialog.tsx`. Picking the
primitive picks the behaviour on a phone, and that is the whole API:

- **`Dialog` fills the screen below `sm:`** — header pinned, middle scrolling,
  action pinned to the bottom edge — and is a centred card from `sm:` up. Forms
  go here; a form needs the room, and the thumb never has to go looking for the
  submit button.
- **`AlertDialog` is a centred card at every size.** Questions go here. A
  destructive confirmation blown up to full-screen invites the mis-tap it exists
  to prevent.

Full-screen is expressed as **sizing**, never as a different anchor: both panels
are centred at every size, and the breakpoint changes nothing but the
dimensions. Re-anchoring to all four edges would need an `inset` override that
tailwind-merge silently gets wrong in one order of classes.

Everything the two share lives in
[`src/components/ui/dialog-styles.ts`](../../src/components/ui/dialog-styles.ts).
They are forks of the same shadcn file that had drifted apart once already — the
title sizes disagreed until somebody noticed — so a shared value belongs there
rather than in one of them.

### Three things that will bite

- **Padding is on the regions, not the panel.** Every child of a `*Content` must
  be a `*Header`, `*Body` or `*Footer`, or it renders flush against the edge. A
  padded panel would clip the scrolling middle inside its own edge, so text would
  fade out in mid-air, and the pinned header and footer could not draw a
  full-width rule.

  The one exception is a wrapper that passes the regions through: `WishForm` is a
  `<form>` around a body and a footer, because the submit button has to be inside
  the form it submits. `flex min-h-0 flex-1 flex-col` is what makes it
  transparent — without `min-h-0` a flex child will not shrink below its content,
  the form outgrows the panel, and the footer leaves the screen.

- **The seams are 12 + 4, not 16 + 0.** The body's 4px is what keeps
  `:focus-visible` — a 2px outline at 2px offset — from being clipped by its own
  `overflow-y-auto`. Change one side of a seam and you owe the other its
  complement.

- **A `max-w-*` passed to `DialogContent` must be `sm:`-qualified.**
  Unprefixed, tailwind-merge cannot see it against the primitive's
  breakpoint-scoped width, so it leaks down to the phone and un-fullscreens the
  panel.

### The keyboard

`interactiveWidget: "resizes-content"` in the root layout viewport is what keeps
the pinned button above the on-screen keyboard: the layout viewport shrinks, the
panel shrinks with it, and the button rides up.

**Chromium only.** Safari does not implement `interactive-widget`, so on iOS the
keyboard still covers the footer. Nothing becomes unreachable — the body scrolls,
and dismissing the keyboard brings the button back — but do not read this as
having solved iOS. There is no CSS-only fix.

The full-screen panel's height is a percentage, not a dynamic-viewport unit. A
fixed element's percentage height resolves against the layout viewport, which is
the thing that actually shrinks; viewport units track the browser's own toolbars
instead and would leave the footer below the fold with a keyboard up.

## A refusal ends the dialog

When an action returns `final` ([Wishes](wishes.md#errors-and-results)), the
dialog swaps the way forward for the way out — a button that visibly does nothing
reads as a bug.

- **`ConfirmActionDialog`** becomes its refused title — "Nedá sa vymazať" for
  `DeleteWishButton`, "sa nedá označiť" for `FulfilWishButton` — with the reason
  as its description and a single **Zavrieť**. It is a controlled `AlertDialog`
  purely so the failure clears on close: reopening asks again, and by then the
  wish may have been released. Both buttons are thin wrappers over it, so the
  behaviour is defined once.
- **`WishForm`** replaces its submit button with **Zavrieť**. Its state resets by
  itself, because Radix unmounts dialog content when closed.

A **non-final** failure keeps the old behaviour: the question stands, the error
sits above the buttons, and the button can be pressed again. Without the
distinction, the shared `WishForm` could not tell "somebody reserved it" from
"the title is too long", and fixing a typo and resubmitting would stop working.

Adding a wish whose *photo* fails is `final` for the same reason, even though
nothing was reserved: the wish is already saved, so pressing the button again
would add a second one. The message says so.

## Picking a photo

`WishPhotoField` ([`src/components/wish-photo-field.tsx`](../../src/components/wish-photo-field.tsx))
is the fourth field of `WishForm`. What it stores in the form is a *choice* —
unchanged, cleared, or a file — not a nullable file, because an edit has to be
able to leave the old photo alone and to take it away, and those are different
answers.

Two things about it are deliberate:

- **No `capture` attribute** on the file input. `capture` opens the camera and
  takes the photo library away with it, and the thing people most want to attach
  is a screenshot of a shop's page, which lives in the library. Plain
  `accept="image/*"` gets a phone to offer camera, library and files.
- **The drop hint is `hidden sm:block`.** Dropping a file is not a gesture a
  phone has, and the app is designed for phones first; the line would be noise
  on the screen most people read it on. The drop target itself is always live —
  it just goes unmentioned where it cannot be used.

The preview is a `data:` URL rather than `URL.createObjectURL`. An object URL has
to be revoked by hand, and every path that forgets — a re-pick, a removal, a
closed dialog — leaks a whole image for the life of the tab.

## Layout contract

The root layout deliberately has **no `<main>`**. Each child supplies its own
`<main className="flex-1">`, and both halves are load-bearing:

- the **element**, because a `<header>` nested inside `<main>` stops being the
  `banner` landmark;
- the **class**, because `flex-1` fills the `min-h-dvh` column, lets a short page
  centre itself, and holds the install nudge to the bottom edge.

Three files own one today: `(app)/layout.tsx`, `login/layout.tsx` and
`not-found.tsx`. Anything else rendered directly under the root layout owes one.

### The `(app)` route group

`(app)` adds nothing to any URL. Its only job is to draw a line between routes
that have a session behind them and the two surfaces a stranger can reach —
`/login` and the 404 — so the header is never chrome for a stranger.

The line is "has a session", not "is approved": `/pending` sits inside the group
and gets the header, with the account half empty, and carries its own sign-out
button.

The group has no `loading.tsx` of its own — it would become the fallback for
every route beneath it and flash in front of each route's own skeleton. For the
same reason `(home)/loading.tsx` sits one directory down rather than beside the
root layout.

Skeletons are not only loading states: Next prefetches them as each route's
shell, so they are also what renders when someone taps through with no signal.

### The 404

One `not-found.tsx`, at the root. It catches both the `notFound()` thrown by
`/member/[id]` and any unmatched URL, and both land there *without* the header —
the boundary sits inside the root layout but above `(app)/layout.tsx`. Hence the
file bringing its own `<main>` and its own way back.

Nothing is fetched and nobody is redirected: a signed-out visitor who guesses a
URL sees the 404 rather than the login page, because bouncing them would hide the
fact that the address is simply wrong.

## Typography

**Atkinson Hyperlegible Next**, drawn by the Braille Institute for readers with
low vision. Its letterforms are deliberately hard to confuse and its x-height is
large, so a given pixel size reads bigger than a neutral grotesque.

Self-hosted rather than fetched through `next/font/google`, for two reasons:

- The file is the upstream variable font, uncut, so it carries the whole Latin
  range. Google serves this family in per-script slices whose `latin` slice stops
  at U+00FF — below every Slovak caron and the ŕ/ĺ — and `next/font/local` cannot
  attach a `unicode-range` per file.
- `next/font/local` reads metrics out of the file with fontkit instead of looking
  them up in Next's `capsize-font-metrics.json`, which has no entry for this
  family. That lookup miss is what made the Google loader skip the size-adjusted
  fallback face, the one that keeps the page from reflowing when the real font
  swaps in.

Do not hand-write that fallback from the OS/2 `xAvgCharWidth` field — fonts
disagree on what it averages over, so comparing it across families is
meaningless.

Line length is capped at `62ch` for left-aligned body copy. The login card is a
different shape (centred, ~45ch) and does not repeat the rule.

## The installable app

The app is a PWA: `manifest.ts` makes it installable, and `InstallPrompt` nudges
towards it. Two paths, because the platforms disagree — Chrome fires
`beforeinstallprompt` and gives a real one-tap install; iOS Safari fires nothing
and the only way in is the share sheet. A dismissal is remembered in
`localStorage`.

The prompt and the offline banner both live in the **root** layout, not behind
sign-in. The person most likely to install this is someone who has just landed on
`/login` on a phone, and signing in is itself a Server Action that would otherwise
fail silently.

**There is deliberately no service worker.** Cached HTML could show an owner their
own claims. `experimental.useOffline` in `next.config.ts` covers offline instead:
it holds failed navigations, prefetches and Server Actions and retries them when
the connection returns. `OfflineBanner` exists to explain why a tap looks like it
did nothing.

### Icons

One drawing, `IconArtwork` in [`src/lib/icon-artwork.tsx`](../../src/lib/icon-artwork.tsx),
serves `/icon` (512px, both `any` and `maskable`) and `/apple-icon` (180px,
opaque — iOS renders transparency as black).

- The gift glyph is lucide's geometry **inlined by hand**. These routes rasterise
  through Satori, which draws plain SVG but does not render React components, so
  `<GiftIcon />` would come out blank.
- The background is full-bleed and the glyph sits at **56%** of the canvas,
  inside Android's inner-80% adaptive-icon safe zone. That ratio is the rule —
  the login tile repeats it at 36/64 — and any rescale has to keep it.
- Both metadata routes are `force-static`, or the root layout's `force-dynamic`
  would leak down and rasterise a PNG on every request.
- There is deliberately no `favicon.ico`. One would emit a second
  `<link rel="icon">` carrying `sizes="any"`, which browsers prefer, so the .ico
  would win the tab and this drawing would only ever be seen on a home screen.

`THEME_COLORS` ([`src/lib/theme-colors.ts`](../../src/lib/theme-colors.ts))
mirrors three `globals.css` tokens in sRGB, because manifests, `<meta
name="theme-color">` and Satori cannot take `oklch()`. Keep them in step by hand.
