# The privacy rule

> **A list owner must never learn *who* claimed one of their own wishes, and
> must never be shown claims while reading their own list. The secret ends only
> when the giver ends it, by marking the gift handed over — and never any other
> way.**

Everyone else sees claims. The owner does not. Every unusual decision in this
codebase follows from that sentence.

## Why it cannot be a database policy

The natural Supabase design is: the browser holds the anon key, talks to
Postgres directly, and row level security decides who sees what.

That cannot work here. "Hide the claim from the person whose list it is" is not
expressible as an RLS policy — the row belongs to the owner, so any policy that
lets them read their own row lets them read `claimed_by` with it. If the browser
held a key that could read `wishes` at all, anyone could open devtools and see
who was buying what for them. The surprise would be a UI illusion.

So instead:

- Row level security is **on** for every table with **zero policies**. Neither
  the anon key nor a signed-in session can read or write anything.
- Every read and write happens on the server with the `service_role` key.
- Supabase Auth answers exactly one question — *who is this person* — and never
  touches a table.

Sign-in raised the stakes on that split rather than relaxing it: browsers now
carry a real authenticated session, so a policy added to `wishes` in a weak
moment would leak further than it would have before.

The two clients are [`src/lib/supabase-auth.ts`](../../src/lib/supabase-auth.ts)
(the visitor's session, reads no table) and
[`src/lib/supabase.ts`](../../src/lib/supabase.ts) (`service_role`, does all the
data work).

## Where the rule is enforced

Nine places, in three groups. Change one and the rest need checking.

### Reading a list

1. `getWishListFor` ([`src/lib/queries.ts`](../../src/lib/queries.ts)) selects
   `OWNER_WISH_COLUMNS` on the owner path, so claim columns never leave the
   database.
2. `OwnerWish` ([`src/lib/types.ts`](../../src/lib/types.ts)) has no claim
   fields, which makes a leak a type error rather than something to remember.
3. `toOwnerWish` ([`src/lib/wishes.ts`](../../src/lib/wishes.ts)) builds an
   explicit object instead of spreading the row, so a claim column cannot ride
   along even if the query is later widened.
4. [`src/lib/wishes.test.ts`](../../src/lib/wishes.test.ts) pins it down.

### Counting on the family grid

Each card shows how many wishes are still free next to the total — "2 / 5".
"3 / 5" on your **own** card would say, in arithmetic, that two of yours are
already taken. So your own card shows the bare total.

5. `getMemberSummaries` ([`src/lib/queries.ts`](../../src/lib/queries.ts))
   counts free wishes with `.is("claimed_by", null)` **and**
   `.neq("member_id", viewerId)`, so no claim column is selected and the
   viewer's own rows never reach the count.
6. `MemberSummary` ([`src/lib/types.ts`](../../src/lib/types.ts)) is
   discriminated on `viewerIsOwner`; the owner half of the union has no
   `availableCount` field to render.
7. `toMemberSummary` ([`src/lib/members.ts`](../../src/lib/members.ts)) returns
   that half for the viewer.
8. [`src/lib/members.test.ts`](../../src/lib/members.test.ts) pins it down.

An empty list also shows a bare total, because "0 / 0" is noise.

### Serving a photo

An owner looking at their own list fetches their own photos, so the route that
serves them is an owner-serving path like any other.

9. The handler at
   [`src/app/wish-photo/[wishId]/route.ts`](../../src/app/wish-photo/%5BwishId%5D/route.ts)
   selects `photo_path` alone and never `claimed_by`. It answers 404 — not 403 —
   to anyone it will not serve, so the response says nothing about which wishes
   exist either.

Live updates are the third surface the rule reaches — see
[Live updates](live-updates.md).

## The deliberate exception: a reserved wish is frozen

The rule above governs *reading*. Writing has one carve-out, and it is the only
place the app ever admits a claim to an owner.

**An owner cannot delete or edit a wish somebody has reserved.** Nothing on the
list is disabled or badged — the bin opens the same confirmation, the pencil
opens the same form — but confirming is refused:

> Toto želanie už má niekto rezervované, preto ho nemôžeš vymazať.
> *(…upraviť.)*

It never says by whom, and that part is not negotiable.

### This is a known, accepted hole

An owner who clicks the bin on every wish learns which of them are taken.

It was chosen over the previous design, where the owner's delete silently
succeeded and the buyer was told afterwards through a `claim_notices` table.
Better to keep the gift than to keep the secret from someone determined to break
it. That table, its two triggers and the notice UI were removed in
`0005_drop_claim_notices.sql`.

Do not "fix" the inconsistency by hiding the refusal, and do not extend it by
showing claim state on the owner's list.

### How the refusal works

1. `.is("claimed_by", null)` sits in the `WHERE` clause of `updateWish` and
   `deleteWish` ([`src/app/actions/wishes.ts`](../../src/app/actions/wishes.ts)),
   next to `.eq("member_id", …)`. That is the whole guard, and it is race-free
   for the same reason claiming is: a claim landing first stops the row from
   matching. It must never become a read-then-write.
2. `lookUpRefusal` in the same file reads `claimed_by` **only after** the write
   matched nothing, and only to choose the wording. This is the one
   owner-serving path allowed to select that column. The value never leaves the
   function, and it must never migrate into `OWNER_WISH_COLUMNS`,
   `getWishListFor` or `OwnerWish`.
3. `refusalFor` ([`src/lib/wishes.ts`](../../src/lib/wishes.ts)) is pure and
   holds both sentences.
4. [`src/lib/wishes.test.ts`](../../src/lib/wishes.test.ts) pins it down,
   including that no claimer id appears.

What the owner sees when refused is covered in
[UI patterns → A refusal ends the dialog](ui-patterns.md#a-refusal-ends-the-dialog).

## When the secret ends

A claim is a secret. A gift that has been handed over is not.

The buyer presses **Darované** on [*Čo kupujem*](claiming.md#what-im-buying).
The wish is deleted from its owner's list and a row is written to
`fulfilled_wishes` that names both people to each other. The owner reads it at
`/received`; the giver reads their side at `/buying/history`.

This is the only place in the app where an owner is told who bought them
something, and it is not a leak: by the time the button is pressed, the gift is
in their hands.

### Four invariants

1. **Only the holder ends it.** `fulfilled_wishes` is written by `fulfil_wish`
   and by nothing else, and `fulfil_wish` matches on `claimed_by = p_giver_id`
   and on nothing else. No admin override, no cron, no "auto-fulfil after
   Christmas" — an app that ends the secret on the giver's behalf has taken the
   one decision that was theirs.
2. **`fulfilled_wishes` holds no live claims,** by construction: a row exists
   only because the wish it describes was deleted in the same statement. So
   `/received` can never become an oracle for what is currently reserved.
3. **The `revoke execute` in `0007_fulfilled_wishes.sql` is load-bearing.**
   Postgres grants `EXECUTE` on a new function to `PUBLIC`, so without it
   anyone holding the anon key could call `fulfil_wish` from devtools and
   delete a claimed wish while forging a history row — past the zero-policy
   wall, because a function is not a table. `PUBLIC` includes `service_role`,
   so the revoke is always paired with an explicit grant back.
4. **The owner's count falling is accepted.** Their list shrinks by one at that
   moment. They learn "one of mine was bought and given", which is exactly what
   they already know, because they are holding it.

### The second accepted hole

A giver who presses **Darované** before actually handing the gift over spoils
their own surprise, live, in the owner's open tab.

The mitigation is the confirmation dialog's second sentence and nothing else.
This is deliberately not a code problem: no delay, no scheduling, no "hold until
December". Any of those would mean the app deciding when a gift was given, which
it cannot know.

### What did not change

The nine enforcement points above all govern `wishes`, and a fulfilled record
is no longer a wish. In particular, *never select `claimed_by` on an
owner-serving path* stands exactly as written: `/received` reads a different
table and learns nothing about any live claim.

## Never do these

- Add an RLS policy to any table.
- Enable `postgres_changes`. It is RLS-filtered, so switching it on means
  granting the browser read access to `wishes`, and every owner would receive
  their own `claimed_by` values.
- Put anything in `LIVE_PAYLOAD` ([`src/lib/live.ts`](../../src/lib/live.ts)).
- Skip the live ping for the owner's tab — see
  [Live updates](live-updates.md#why-the-owners-tab-refreshes-too).
- Cache a rendered page anywhere a second visitor could reach it. There is no
  service worker for this reason, and the root layout is `force-dynamic`.
