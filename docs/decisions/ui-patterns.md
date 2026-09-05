# UI patterns

The app is read by grandparents on phones. That is the brief, and most of what
follows is downstream of it.

## Language

The app is read in Slovak and in English, and which one is a cookie rather than
a URL — the reasoning, the plural forms and what happens to error messages are
all in [Language](language.md).

What belongs here is the switcher. Whichever form it takes, the offer is **the
other language and nothing else** — with two languages a pair of options or a
submenu says the same thing at more length, and an item that states what it will
do needs no state to read.

It takes two forms, because there are two places to put it:

- **Signed in, one item in the avatar menu.** The menu is already where account
  things live.
- **Signed out, a button in the header** (`locale-switcher.tsx`). This is what
  `setLocale` was always built for — it takes no caller precisely so it can work
  where nobody has signed in — and for a long time nothing reached it. The
  switcher lived inside the avatar menu, the menu inside the header, and the
  header was mounted below the sign-in page, so `/`, `/privacy`, `/terms` and
  the 404 had no way to change language at all.

They are deliberately **not one component**. Inside Radix the form has to be
mounted outside `DropdownMenu` and reached by `form={id}`; standalone, the form
wraps its button. One component covering both would need a prop that switches
its whole structure. Everything that could actually drift — `otherLocale`,
`LOCALE_LABELS`, `LOCALE_FLAGS`, `setLocale` — is shared already; what is
duplicated is four lines of markup.

Either way the label is written **in the language it selects** — "Use English"
while the app is Slovak, "Použiť slovenčinu" while it is English. Somebody
reaching for that control is quite likely doing it because they cannot read the
rest of the screen, so a label in the current language would be the one thing on
screen that had to be legible and was not.

That is also why the standalone button never hides its label on a narrow
viewport the way the header's other labels do. The flags are `aria-hidden`, so
the label *is* the button's accessible name — and a flag on its own is a poor
sign for a language. It carries `lang` instead, or a screen reader voices
"Použiť slovenčinu" in an English accent.

In the menu the form is mounted *outside* `DropdownMenu` and reached by id — the
same trick **Odhlásiť sa** uses, and for the same reason: Radix unmounts menu
content on select, so a form inside it would be torn down mid-submit. Standalone
the form simply wraps its button. Both are plain `<form action={serverAction}>`,
so the switch still works with JavaScript off.

Names are collated with `Intl.Collator("sk")` in both languages, so Č sorts
after C rather than after Z — and a list does not reshuffle itself when somebody
switches language.

## Dialogs

Picking the primitive picks the behaviour on a phone, and that is the whole API:

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

The two are forks of the same shadcn file, so everything they share lives in
`dialog-styles.ts`. Kept in one fork, a value drifts out of step with the other
and nothing complains.

### Three things that will bite

- **Padding is on the regions, not the panel.** Every child of a `*Content` must
  be a `*Header`, `*Body` or `*Footer`, or it renders flush against the edge. A
  padded panel would clip the scrolling middle inside its own edge, so text
  would fade out in mid-air, and the pinned header and footer could not draw a
  full-width rule.

  The one exception is a wrapper that passes the regions through: `WishForm` is
  a `<form>` around a body and a footer, because the submit button has to be
  inside the form it submits. `flex min-h-0 flex-1 flex-col` is what makes it
  transparent — without `min-h-0` a flex child will not shrink below its
  content, the form outgrows the panel, and the footer leaves the screen.

- **The seams are 12 + 4, not 16 + 0.** The body's 4px is what keeps
  `:focus-visible` — a 2px outline at 2px offset — from being clipped by its own
  `overflow-y-auto`. Change one side of a seam and you owe the other its
  complement.

- **A `max-w-*` passed to `DialogContent` must be `sm:`-qualified.**
  Unprefixed, tailwind-merge cannot see it against the primitive's
  breakpoint-scoped width, so it leaks down to the phone and un-fullscreens the
  panel.

### The keyboard

`interactiveWidget: "resizes-content"` in the root layout viewport keeps the
pinned button above the on-screen keyboard: the layout viewport shrinks, the
panel shrinks with it, and the button rides up.

**Chromium only.** Safari does not implement `interactive-widget`, so on iOS the
keyboard still covers the footer. Nothing becomes unreachable — the body
scrolls, and dismissing the keyboard brings the button back — but do not read
this as having solved iOS. There is no CSS-only fix.

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

- `loading` implies `disabled`. Pass `disabled` *as well* when something other
  than this button's own work is holding it — that is the majority of call
  sites, not the exception.
- The mute is `disabled:opacity-75`, not the `disabled:opacity-50` a plain
  disabled button gets, because the spinner sits *inside* that fade. The label
  drops to `opacity-25` within it: the spinner lands in the middle of the word,
  and at anything more readable the two collide and `Uložiť zmeny` renders as
  `Uloži⟳zmeny`. Neither number is arithmetic; change one and look at every
  variant and size again.
- **`size="icon"` hides its content instead of dimming it.** One glyph, no room
  beside it, and a spinner drawn over a glyph is unreadable.
- A busy button carries `aria-busy` and says nothing more. There is deliberately
  no `sr-only` alternative text — that would be a label swap under another name.
- **`loading` cannot be combined with `asChild`, and the prop type says so.**
  `Slot` would not throw: it would clone the spinner fragment, dropping every
  class and the `disabled` — an unstyled, still-clickable control rather than a
  failure.
- **`AlertDialogAction` renders a real `Button`**, which is what lets a
  confirmation spin. The `asChild` sits on the Radix primitive rather than on
  the `Button`, so `onClick` stays on the primitive and `preventDefault()` can
  still hold the dialog open on failure.

Two places need more than the prop:

- **A plain `<form action={serverAction}>`** has no transition to read, so its
  button is `SubmitButton` — one `useFormStatus` call and nothing else. It is
  the only client component the sign-in card is allowed, and it is what the
  header's language switcher uses too; either form still posts with JavaScript
  off.
- **`ManageMembers`** drives every control from a single `useTransition`, which
  cannot say which button was pressed. `busy()` takes a `verb:id` key and hands
  back `disabled`, `loading` and `onClick` together. Six spinners at once says
  nothing about which one you asked for.

Buttons that wait on something outside the app keep no busy state at all — a
spinner behind a native install sheet is not feedback.

## A refusal ends the dialog

When an action returns `final`, the dialog swaps the way forward for the way out
— a button that visibly does nothing reads as a bug.

- **`ConfirmActionDialog`** becomes its refused title, with the reason as its
  description and a single **Zavrieť**. It is a controlled `AlertDialog` purely
  so the failure clears on close: reopening asks again, and by then the wish may
  have been released.
- **`WishForm`** replaces its submit button with **Zavrieť**.

A **non-final** failure keeps the old behaviour: the question stands, the error
sits above the buttons, and the button can be pressed again. Without the
distinction, `WishForm` could not tell "somebody reserved it" from "the title is
too long", and fixing a typo and resubmitting would stop working.

Adding a wish whose *photo* fails is `final` for the same reason, even though
nothing was reserved: the wish is already saved, so pressing again would add a
second one.

### `confirmVariant`

The confirm button is the primary colour unless a caller asks for
`destructive` — the prop admits those two and nothing else.
[Deleting a group](groups-and-invites.md#deleting-a-group) is the only one that
asks: red for the one action that ends something for other people, rather than
red on every bin.

### An action that navigates away resolves with nothing

Next's action reducer drops a Server Action's return value when the response
carries a redirect, so the awaited result is `undefined` on the success path.
Dereferencing it unguarded would throw inside the transition, on the one path
where everything worked.

This is a fact about the action boundary rather than about one component, so it
lives in the type both client helpers take: `ActionOutcome` is `ActionResult |
undefined`. A new redirecting action needs no change to either.

## Picking a photo

What the field stores in the form is a *choice* — unchanged, cleared, or a file
— not a nullable file, because an edit has to be able to leave the old photo
alone and to take it away, and those are different answers.

- **No `capture` attribute.** `capture` opens the camera and takes the photo
  library away with it, and the thing people most want to attach is a screenshot
  of a shop's page. Plain `accept="image/*"` gets a phone to offer camera,
  library and files.
- **The drop hint is `hidden sm:block`.** Dropping a file is not a gesture a
  phone has. The drop target itself is always live — it just goes unmentioned
  where it cannot be used.
- **The preview is a `data:` URL**, not `URL.createObjectURL`. An object URL has
  to be revoked by hand, and every path that forgets leaks a whole image for the
  life of the tab.

## Looking at a photo

A thumbnail opens the full picture in a `Dialog`, not in a new tab. A tab is
wrong in both places the app runs: installed, it is `display: "standalone"`, so
`target="_blank"` hands the photo to a separate browser and the way back is a
task switch; in a desktop tab it is whatever browser chrome is on screen. A
dialog closes four ways and the list is still underneath, scrolled where it was.

The footer button is not a spare X. The X sits in the top-right corner, which on
a phone is the corner a thumb reaches last; the footer is where it reaches
first.

Inside the dialog the picture is **full width and its own height**, scrolling in
the body. Fitting it to the panel would undo the reason the thumbnail opens at
all: a screenshot scaled to fit a phone-tall panel is back to being unreadable.

## A group tag

An outline `Badge` per group, carrying the same icon the group switcher uses —
one glyph means "group" everywhere, which is what lets the badge show a bare
name with no label beside it. `outline` and not `secondary`: this is metadata
repeated on every row, and the filled badge is already spoken for by *správca*,
which is a role claim and should stay the louder of the two.

It appears on the **four lists that span more than one group** — the owner's own
list, `/buying`, and the two history pages — and nowhere else. Every other list
is scoped to one group in its query, so the tag would only repeat the URL.

A history row's badges are read off the record's own snapshot of names. There is
no id to resolve and no live group to resolve it against — that is what lets the
record outlive the group it names.

It renders **nothing** for somebody in a single group: every wish they can see
is there through it, so the badge would say the same thing on every row. That is
the same rule that hides the group picker in `WishForm`, so both ask
`groupsWorthNaming` rather than comparing lengths — two spellings in opposite
polarities would drift.

The tag sits directly under the wish's title, not below its content. A
description runs to 62ch over any number of lines and the link below it is a
44px target, so a tag after them lands at an unpredictable height and stops
being scannable down a list. The slot is rendered **bare** — no wrapper —
because a wrapper around something that renders `null` still takes a row of
`space-y-1.5`.

## Layout contract

The root layout owns the whole shell: the header, then
`<main className="flex-1">` around the page, then the install nudge and the
footer. Two details are load-bearing:

- the header is a **sibling** of `<main>`, never inside it — a `<header>` nested
  in `<main>` stops being the `banner` landmark;
- `flex-1` on the `<main>` fills the `min-h-dvh` column, lets a short page
  centre itself, and pushes the nudge and the footer down to the bottom edge.

**The header used to sit in `(app)` and every page had to bring its own
`<main>`.** Both followed from one rule — the header was chrome for members
only, so it could not be a root-layout sibling, so a root `<main>` would have
swallowed it. Once the header became everyone's, that rule went, and with it the
five copies of an identical wrapper it had forced.

### Chrome is for strangers too

The header and the footer are both unconditional, for the same reason. The
surfaces somebody reaches before they have an account — `/`, `/privacy`,
`/terms`, the 404 — are exactly the ones that need a way back and a way to
change language, and Google's OAuth reviewer reads two of them signed out.
Mounting either below sign-in would hide it from precisely the person looking.

What changes is the header's right-hand half, not its presence: the language
switch alone for a stranger, the account menu for somebody with no group yet
(that menu holds the only way to sign out), the full cluster for a member. Its
left half is the same gift mark everywhere, linking to the current group or to
`/`.

The sign-in card keeps its own large gift tile under that. The two are not a
repetition: one is 24px of chrome in a corner, the other is the 64px hero of a
front door.

### `(app)` and `(legal)`

Both add nothing to any URL and neither carries a layout any more. They survive
as file organisation — one directory for the routes that need a session, one for
the two pages that must stay readable without one. Flattening them would move
ten page files and change nothing.

Neither has a `loading.tsx`, and `(app)` must not gain one: it would become the
fallback for every route beneath it and flash in front of each route's own
skeleton. Skeletons are not only loading states — Next prefetches them as each
route's shell, so they are also what renders when someone taps through with no
signal.

### The 404

One `not-found.tsx`, at the root. It catches both the `notFound()` thrown from
anywhere under `/g/[groupId]` and any unmatched URL, and it wears the header
like everything else.

It keeps a **labelled** way back of its own all the same. That is the page's
whole action, and `HomeLink` is a bare glyph in the corner with an `aria-label`
— for a reader with low vision those are not the same offer.

`HomeLink` reads the group from the path rather than from a server prop, because
the header it sits in may already be on screen above a page that turned out not
to exist: on a segment owning a `loading.tsx` the root layout is `force-dynamic`,
the shell flushes with the skeleton, and the `notFound()` that follows is
streamed into a response whose status is already `200`.

Nothing is fetched here and nobody is redirected *from* here — but that is a
fact about the file, not about the app. `proxy.ts` bounces a signed-out visitor
off any path that is not public, so in practice a wrong address shows this page
only to somebody who already has a session. Anyone else lands on the sign-in
card instead, and never learns the address was wrong.

## Typography

**Atkinson Hyperlegible Next**, drawn by the Braille Institute for readers with
low vision. Its letterforms are deliberately hard to confuse and its x-height is
large, so a given pixel size reads bigger than a neutral grotesque.

Self-hosted rather than fetched through `next/font/google`, for two reasons:

- The file is the upstream variable font, uncut, so it carries the whole Latin
  range. Google serves this family in per-script slices whose `latin` slice
  stops at U+00FF — below every Slovak caron and the ŕ/ĺ — and
  `next/font/local` cannot attach a `unicode-range` per file.
- `next/font/local` reads metrics out of the file with fontkit instead of
  looking them up in Next's `capsize-font-metrics.json`, which has no entry for
  this family. That lookup miss is what made the Google loader skip the
  size-adjusted fallback face, the one that keeps the page from reflowing when
  the real font swaps in.

Do not hand-write that fallback from the OS/2 `xAvgCharWidth` field — fonts
disagree on what it averages over, so comparing it across families is
meaningless.

Line length is capped at `62ch` for left-aligned body copy. The login card is a
different shape (centred, ~45ch) and does not repeat the rule.

## The installable app

`manifest.ts` makes it installable and `InstallPrompt` nudges towards it. Two
paths, because the platforms disagree — Chrome fires `beforeinstallprompt` and
gives a real one-tap install; iOS Safari fires nothing and the only way in is
the share sheet. A dismissal is remembered in `localStorage`.

The prompt and the offline banner both live in the **root** layout, not behind
sign-in. The person most likely to install this is someone who has just landed
on `/` on a phone.

**There is deliberately no service worker.** Cached HTML could show an owner
their own claims. `experimental.useOffline` covers offline instead: it holds
failed navigations, prefetches and Server Actions and retries them when the
connection returns. `OfflineBanner` exists to explain why a tap looks like it
did nothing.

### Icons

One drawing serves `/icon` (512px, both `any` and `maskable`) and `/apple-icon`
(180px, opaque — iOS renders transparency as black).

- The gift glyph is lucide's geometry **inlined by hand**. These routes
  rasterise through Satori, which draws plain SVG but does not render React
  components, so `<GiftIcon />` would come out blank.
- The background is full-bleed and the glyph sits at **56%** of the canvas,
  inside Android's inner-80% adaptive-icon safe zone. That ratio is the rule —
  the login tile repeats it at 36/64 — and any rescale has to keep it.
- Both metadata routes are `force-static`, or the root layout's `force-dynamic`
  would leak down and rasterise a PNG on every request.
- There is deliberately no `favicon.ico`. One would emit a second
  `<link rel="icon">` carrying `sizes="any"`, which browsers prefer, so the
  .ico would win the tab and this drawing would only be seen on a home screen.

`THEME_COLORS` mirrors three `globals.css` tokens in sRGB, because manifests,
`<meta name="theme-color">` and Satori cannot take `oklch()`. Keep them in step
by hand.
