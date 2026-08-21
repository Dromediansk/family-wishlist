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
They are forks of the same shadcn file, so a shared value belongs there rather
than in one of them: kept in a single fork it drifts out of step with the other
and nothing complains.

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

## A busy button keeps its label

There is one busy affordance in the app and `Button` owns it: pass `loading`.
The surface mutes, a spinner appears in the centre, and **the label does not
change**.

No call site invents a Slovak verb for the wait. A label that swaps `Toto kúpim`
for `Rezervujem…` puts one idea in as many phrasings as there are files, and it
resizes the button mid-action — on a phone that moves the thing under the thumb
that just pressed it.

- `loading` implies `disabled`, so nothing repeats it for the same reason. Pass
  `disabled` *as well* when something other than this button's own work is
  holding it: a sibling's action in `ManageMembers`, an empty title in
  `WishForm`, the parent field's lock in `WishPhotoField`. That is the majority
  of the call sites, not the exception.
- The mute is `disabled:opacity-75`, not the `disabled:opacity-50` a plain
  disabled button gets. The spinner sits *inside* that fade — an `opacity` group
  applies to every descendant, so there is no keeping it crisp over a half-faded
  surface. 75% is what leaves it legible on all six variants in both themes.
- The label drops to `opacity-25` inside that, ending near a fifth. It has to be
  that faint: the spinner lands in the middle of the word, and at anything more
  readable the two collide and `Uložiť zmeny` renders as `Uloži⟳zmeny` — broken
  text rather than a busy control. Neither number is arithmetic; change one and
  look at every variant and size again.
- **`size="icon"` hides its content instead of dimming it.** There is one glyph
  and no room beside it, and a spinner drawn over a glyph is unreadable. The box
  still holds its `size-11`.
- A busy button carries `aria-busy`, and its reach is small: on a `<button>` it
  sits in no announcement path, and the control goes `disabled` in the same
  breath, so nothing is spoken. There is deliberately no `sr-only` alternative
  text — that would be a label swap under another name — and a busy control that
  says nothing is the accepted cost of a label that does not move.
- **`loading` cannot be combined with `asChild`, and the prop type says so.**
  `Slot` would not throw: it would take the spinner fragment as its one child
  and clone *that*, dropping every class and the `disabled` — an unstyled,
  still-clickable control rather than a failure. `SubmitButton` always passes
  `loading`, so the pairing is live rather than hypothetical.
- **`AlertDialogAction` renders a real `Button`** — that is what lets a
  confirmation spin, and `AlertDialogCancel` matches it rather than keeping a
  second way to draw the same control. The `asChild` sits on the Radix primitive
  rather than on the `Button`, so `onClick` stays on the primitive and
  `event.preventDefault()` can still hold the dialog open on failure.

Two places need more than the prop:

- **A plain `<form action={serverAction}>`** has no transition to read, so its
  button is [`SubmitButton`](../../src/components/submit-button.tsx) — one
  `useFormStatus` call and nothing else. It is the only client component
  `/login` is allowed; the page around it stays a Server Component and the form
  still posts with JavaScript off.
- **`ManageMembers`** drives every control on `/g/[groupId]/family` from a single
  `useTransition`, which cannot say which button was pressed. `busy()` takes a
  `verb:id` key and hands back the button's `disabled`, `loading` and `onClick`
  together, so the key is written once — only the button whose key is running
  spins, and its siblings are disabled and silent. Six spinners at once says
  nothing about which one you asked for.

Buttons that wait on something outside the app keep no busy state at all:
`InstallPrompt` awaits the *browser's* install sheet, and a spinner behind a
native modal is not feedback. The account menu's sign-out is a raw `<button>`
aimed at a form it does not sit inside, and Radix unmounts the menu on select —
there is nothing left on screen to spin.

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

### `confirmVariant`

The confirm button is the primary colour unless a caller asks for
`destructive` — the prop admits those two and nothing else. `DeleteGroupButton`
([Deleting a group](groups.md#deleting-a-group)) is the only one that asks: red
for the one action in the app that ends something for other people, rather than
red on every bin.

### An action that navigates away resolves with nothing

Next's action reducer drops a Server Action's return value when the response
carries a redirect, so the awaited result is `undefined` on the success path of
`deleteGroup`. Dereferencing it unguarded would throw inside the transition, on
the one path where everything worked.

This is a fact about the action boundary rather than about one component, so it
lives in the type both client helpers take: `ActionOutcome`
([`src/lib/types.ts`](../../src/lib/types.ts)) is `ActionResult | undefined`, and
`ConfirmActionDialog` and `useAction` each guard before reading `ok`. A new
redirecting action needs no change to either.

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

## Looking at a photo

A thumbnail on a wish opens the full picture in a `Dialog`
([`WishPhotoDialog`](../../src/components/wish-photo-dialog.tsx)), not in a new
tab. A tab is wrong in both places the app runs: installed, the app is
`display: "standalone"`, so `target="_blank"` hands the photo to a separate
browser and the way back is a task switch; in a desktop tab it is whatever
browser chrome is on screen, which is not the app's business. A dialog closes
four ways — the X, the footer button, Escape, a click outside — and the list is
still underneath, scrolled where it was.

The footer button is not a spare X. The X sits in the top-right corner, which on
a phone is the corner a thumb reaches last; the footer is where it reaches first.

Inside the dialog the picture is **full width and its own height**, scrolling in
the body. Fitting it to the panel instead would undo the reason the thumbnail
opens at all: what people attach is usually a screenshot of a shop's page, and a
screenshot scaled to fit a phone-tall panel is back to being unreadable.

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

The line is "has a session", not "belongs to a group": `/start` sits inside the
group and wears the same chrome. The header's right-hand half thins out instead of
disappearing — an account with no group keeps its menu, because that menu holds
the only way to sign out, and loses the group switcher and everything else that
needs a group to name.

The group has no `loading.tsx` of its own — it would become the fallback for
every route beneath it and flash in front of each route's own skeleton. Each
route brings its own instead: `/g/[groupId]` and, one directory down, its member
and family pages, plus `/buying`, `/buying/history` and `/received`. `(home)` has
none because it renders nothing — it only works out which group to redirect to.

Skeletons are not only loading states: Next prefetches them as each route's
shell, so they are also what renders when someone taps through with no signal.

### The 404

One `not-found.tsx`, at the root. It catches both the `notFound()` thrown from
anywhere under `/g/[groupId]` and any unmatched URL. The boundary sits inside the
root layout but above `(app)/layout.tsx`, so a typed-in wrong address arrives with
no header above it — hence the file bringing its own `<main>` and its own way
back.

**It does not follow that a 404 never has a header.** On a segment that owns a
`loading.tsx`, the response has already begun: the root layout is
`force-dynamic`, the shell — header included — flushes with the skeleton, and the
`notFound()` or `redirect()` that follows is streamed into a response whose status
is already `200`. Guessing a group id you are not in, or a member id in a group
you are, lands there that way. That is why `HomeLink` reads the group from the
path rather than from a server prop: the header it sits in may already be on
screen above a page that turned out not to exist.

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
