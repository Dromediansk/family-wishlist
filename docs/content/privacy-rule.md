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
lets them read their own row lets them read `claimed_by_user_id` with it. If the
browser held a key that could read `wishes` at all, anyone could open devtools
and see who was buying what for them. The surprise would be a UI illusion.

So instead:

- Row level security is **on** for every table with **zero policies**. Neither
  the anon key nor a signed-in session can read or write anything.
- Every read and write happens on the server with the `service_role` key.
- Supabase Auth answers exactly one question — *who is this person* — and never
  touches a table.

Sign-in raises the stakes on that split rather than relaxing it: a browser here
carries a real authenticated session, so a policy added to `wishes` in a weak
moment would leak further than one on a project nobody signs into.

The two clients are [`src/lib/supabase-auth.ts`](../../src/lib/supabase-auth.ts)
(the visitor's session, reads no table) and
[`src/lib/supabase.ts`](../../src/lib/supabase.ts) (`service_role`, does all the
data work).

### The read side has no backstop

Keeping an owner's claims from that owner is the rule. Keeping one group's
people out of another group's data is the same problem one level up, and it has
the same shape: `service_role` bypasses RLS, and the rule forbids policies, so
**no database check stands behind a read.** A query that forgot its filter would
simply answer.

What stands there instead is a chokepoint. Every table read lives in
`src/lib/data/`, and every function in there takes a `Viewer` or a
`GroupContext` as its first argument — the scope arrives before the query can be
written. Branded `UserId`, `GroupId` and `MembershipId`
([`src/lib/ids.ts`](../../src/lib/ids.ts)) are minted only in that directory,
where a value has just been read from the column that defines it, so nothing
downstream can pass a string off a URL where an id belongs.

Two rules in [`eslint.config.mjs`](../../eslint.config.mjs) keep it true:
`.from()` and the `getSupabase` import are errors outside `src/lib/data/` — bar
the three server-only helpers that hold the client for Storage or Realtime rather
than for a table. **Read the scope of that guarantee narrowly.**
`src/app/actions/**` is exempt as well, because writes stay in the actions and
moving one would not add its group filter — an action's scope lives in its own
`WHERE` clause. So the enforced guarantee covers **reads, pages and
components**. The write surface is governed by the five-step rule in
[`CLAUDE.md`](../../CLAUDE.md#server-actions) and by review, and a read added
inline in an action is caught by neither.

## Where the rule is enforced

Eleven places, in four groups. Change one and the rest need checking.

### Reading a list

1. `getWishListFor` ([`src/lib/data/wishes.ts`](../../src/lib/data/wishes.ts))
   selects `OWNER_WISH_COLUMNS` on the owner path, so claim columns never leave
   the database.
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

5. `getMemberSummaries` ([`src/lib/data/members.ts`](../../src/lib/data/members.ts))
   counts free wishes with `.is("claimed_by_user_id", null)` **and**
   `.neq("owner_user_id", ctx.userId)`, so no claim column is selected and the
   viewer's own rows never reach the count. It takes a `GroupContext`, so the
   cards it counts for are the members of the group being read.
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

9. `getWishPhotoPath` ([`src/lib/data/wishes.ts`](../../src/lib/data/wishes.ts))
   selects the photo path **and the owner** — never a claim column — and hands
   back nothing when that owner shares no group with the caller. Selecting the
   owner is not selecting a claim; it is the only way the peer check has to run
   at all. The handler at
   [`src/app/wish-photo/[wishId]/route.ts`](../../src/app/wish-photo/%5BwishId%5D/route.ts)
   answers 404 — not 403 — to everything it declines, so the response says
   nothing about which wishes exist either.

### Where two groups meet

A claim is made inside one group, but the wish it sits on belongs to a person
who may be in several. So a claimer's name can be readable to one audience and
must be invisible to another.

10. `revealClaimer` ([`src/lib/visibility.ts`](../../src/lib/visibility.ts))
    answers that question once, `toViewerWish`
    ([`src/lib/wishes.ts`](../../src/lib/wishes.ts)) is the only caller, and
    `ClaimView` ([`src/lib/types.ts`](../../src/lib/types.ts)) makes it stick:
    the `taken` variant of the union carries no name field, so a component
    handed one cannot render a stranger's name. The row still dims —
    *Toto už niekto kupuje* — because "unavailable" is not a secret.
11. Two triggers hold the same line in the database, where a trigger is not a
    policy and the zero-policy wall is untouched. `wishes_check_claim_peer`
    makes a claim between two people who share no group **unstorable**, whatever
    the app code forgot; `memberships_release_claims` releases the claims a
    departure orphans, in both directions.

Live updates are the last surface the rule reaches — see
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

It was chosen over the alternative, where the owner's delete silently succeeded
and the buyer was told afterwards through a `claim_notices` table. Better to keep
the gift than to keep the secret from someone determined to break it. That
table, its two triggers and the notice UI are gone —
`0005_drop_claim_notices.sql`.

Do not "fix" the inconsistency by hiding the refusal, and do not extend it by
showing claim state on the owner's list.

### How the refusal works

1. `.is("claimed_by_user_id", null)` sits in the `WHERE` clause of `updateWish`
   and `deleteWish`
   ([`src/app/actions/wishes.ts`](../../src/app/actions/wishes.ts)), next to
   `.eq("owner_user_id", …)`. That is the whole guard, and it is race-free for
   the same reason claiming is: a claim landing first stops the row from
   matching. It must never become a read-then-write.
2. `lookUpRefusal` in the same file reads `claimed_by_user_id` **only after** the
   write matched nothing, and only to choose the wording. This is the one
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
   and by nothing else, and `fulfil_wish` matches on
   `claimed_by_user_id = p_giver_id` and on nothing else. No admin override, no
   cron, no "auto-fulfil after Christmas" — an app that ends the secret on the
   giver's behalf has taken the one decision that was theirs.
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

### Where history sits in all this

The eleven enforcement points above all govern `wishes`, and a fulfilled record
is not a wish. In particular, *never select `claimed_by_user_id` on an
owner-serving path* stands exactly as written: `/received` reads a different
table and learns nothing about any live claim.

The two names on a record are snapshots from `app_users`, taken at the moment
the gift changed hands, so the record outlives any group either party is in —
[History](history.md).

## Four accepted holes

Four things the rule does not cover. All four are deliberate, and none of them
is an argument for weakening it anywhere else.

1. **An owner who tries to delete every wish learns which are taken** — the
   frozen-wish refusal, above:
   [This is a known, accepted hole](#this-is-a-known-accepted-hole).
2. **A giver can spoil the surprise early** by pressing **Darované** before
   handing anything over: [The second accepted hole](#the-second-accepted-hole).
3. **A person-level list is visible to every group its owner belongs to.** Your
   colleagues read the same list your parents read, and a claim from either
   audience makes the row unavailable to the other. That is what a person-level
   list *is* — the list belongs to the person, not to the circle. Per-wish
   visibility would be the fix and it is not built.
4. **Removal silently un-reserves gifts.** When somebody is
   [removed from a group](groups.md#removing-somebody),
   `memberships_release_claims` releases the claims that group made possible,
   and the gift may already have been bought. Nobody is told, on either side —
   the same choice `0005_drop_claim_notices.sql` made about notices, for the same
   reason: a notice that says "the wish you bought is loose again" is a claim
   notice with extra steps.

## Never do these

- Add an RLS policy to any table — `app_users`, `groups`, `memberships` and
  `invites` included. Four more tables is four more chances to write the policy
  this whole design refuses.
- Enable `postgres_changes`. It is RLS-filtered, so switching it on means
  granting the browser read access to `wishes`, and every owner would receive
  their own `claimed_by_user_id` values.
- Put anything in `LIVE_PAYLOAD` ([`src/lib/live.ts`](../../src/lib/live.ts)).
- Skip the live ping for the owner's tab — see
  [Live updates](live-updates.md#why-the-owners-tab-refreshes-too).
- Query a table anywhere but `src/lib/data/`, where a `Viewer` or a
  `GroupContext` scopes it. The two lint rules say so, and their one exemption is
  a write in a Server Action — never a read.
- Build a `Viewer` anywhere but
  [`src/lib/data/access.ts`](../../src/lib/data/access.ts). `peers` decides who
  may read whose list; two ways of computing it is one too many.
- Cache a rendered page anywhere a second visitor could reach it. There is no
  service worker for this reason, and the root layout is `force-dynamic`.
