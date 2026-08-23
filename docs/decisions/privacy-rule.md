# The privacy rule

> **A list owner must never learn *who* claimed one of their own wishes, and
> must never be shown claims while reading their own list. The secret ends only
> when the giver ends it, by marking the gift handed over — and never any other
> way.**

The rule itself is stated in
[Project context](../project-context.md#the-one-rule). This file is the
reasoning behind it.

## Why it cannot be a database policy

The natural Supabase design — browser holds the anon key, RLS decides who sees
what — cannot work here. "Hide the claim from the person whose list it is" is
not expressible as a policy: the row belongs to the owner, so any policy that
lets them read their own row lets them read `claimed_by_user_id` with it. If the
browser held a key that could read `wishes` at all, anyone could open devtools
and see who was buying what for them.

So RLS is **on** for every table with **zero policies**, every read and write
happens server-side with `service_role`, and Supabase Auth answers exactly one
question — *who is this* — and never touches a table.

Sign-in raises the stakes rather than relaxing them: a browser here carries a
real authenticated session, so a policy added in a weak moment would leak
further than one on a project nobody signs into.

### The read side has no backstop

Keeping one group's people out of another group's data is the same problem one
level up, with the same shape: `service_role` bypasses RLS and the rule forbids
policies, so **no database check stands behind a read**. A query that forgot its
filter would simply answer.

What stands there instead is the `src/lib/data/` chokepoint and branded ids —
[Technical context](../technical-context.md#the-data-layer-chokepoint). Read the
scope of that guarantee narrowly: the lint rules exempt `src/app/actions/**`,
so a read added inline in a Server Action is caught by neither the lint nor the
database.

Four data-layer functions take no `Viewer`, each for a different legitimate
reason: `ensureAppUser` (runs before a `Viewer` can exist, and scopes itself on
the verified `authUserId`), `findInviteByToken` (looked up by a bare token
before its caller has any membership in that group), `markInviteUsed` (a
compare-and-swap on an id the caller has already resolved) and `groupIdsOf`
(takes a branded `UserId`, so the type is still the guard).

## Where the rule is enforced

**In TypeScript:** every enforcement point carries a `PRIVACY-RULE:` tag in its
doc comment.

```
rg 'PRIVACY-RULE:'
```

That listing is the authority. Add an enforcement point, add a tag — this
document does not need editing, and cannot fall out of step. Change one and
check the rest.

**In the database**, three places hold the same line, where a trigger is not a
policy and the zero-policy wall is untouched:

| Object | Holds |
|---|---|
| `wishes_check_claim_peer` | A claim from someone not in any group *this wish* is tagged with is **unstorable**, whatever the app code forgot |
| `memberships_release_claims` | Releases the claims a departure orphans, re-checking per wish whether the claimer is still in any of its tagged groups |
| `fulfil_wish` | Narrows the group tags it snapshots to those both parties stood in, at the moment the claim ends |

The four concerns those points cover, and why each is not obvious:

### Reading a list

The owner path selects no claim column, so claim data never leaves the database.
`OwnerWish` has no claim field, which makes a leak a type error rather than
something to remember. The mapper builds an explicit object rather than
spreading the row, so a claim column cannot ride along if the query is later
widened.

The non-owner path is scoped through `wish_groups`: a wish tagged for a
different one of the owner's groups never reaches the query, regardless of peer
status.

### Counting on the family grid

Each card shows how many wishes are still free next to the total — "2 / 5".
"3 / 5" on your **own** card would say, in arithmetic, that two of yours are
already taken. So your own card shows the bare total, and the type is a
discriminated union whose owner half has no `availableCount` field to render.
An empty list also shows a bare total, because "0 / 0" is noise.

### Serving a photo

An owner looking at their own list fetches their own photos, so the photo route
is an owner-serving path like any other. It answers **404, never 403**, to
everything it declines, so the response says nothing about which wishes exist.

The owner's groups are re-fetched rather than trusted from the tag alone:
nothing prunes `wish_groups` when its owner leaves a group, and a stale tag must
not go on answering for a membership that is gone.

### Where two groups meet

A claim is made inside one group, but the wish belongs to a person who may be in
several. So a claimer's name can be readable to one audience and must be
invisible to another. One function answers that question, with one caller, and
the `taken` variant of the union carries no name field — a component handed one
cannot render a stranger's name.

The row still dims — *Toto už niekto kupuje* — because "unavailable" is not a
secret.

The same narrowing applies to *group tags* on the two screens that span groups:
a tag naming one of the owner's other circles must not reach a giver who is not
in it. `/buying` narrows against live memberships; `fulfil_wish` does it once
more at handover, because the wish those tags hung off is deleted in that very
statement.

Live updates are the last surface the rule reaches —
[Live updates](live-updates.md).

## The deliberate exception: a reserved wish is frozen

The rule governs *reading*. Writing has one carve-out, and it is the only place
the app ever admits a claim to an owner.

**An owner cannot delete or edit a wish somebody has reserved.** Nothing on the
list is disabled or badged — the bin opens the same confirmation, the pencil the
same form — but confirming is refused:

> Toto želanie už má niekto rezervované, preto ho nemôžeš vymazať.
> *(…upraviť.)*

It never says by whom, and that part is not negotiable.

### This is a known, accepted hole

An owner who clicks the bin on every wish learns which of them are taken.

It was chosen over the alternative, where the owner's delete silently succeeded
and the buyer was told afterwards through a `claim_notices` table. Better to
keep the gift than to keep the secret from someone determined to break it. That
table, its two triggers and the notice UI are gone —
`0005_drop_claim_notices.sql`.

Do not "fix" the inconsistency by hiding the refusal, and do not extend it by
showing claim state on the owner's list.

### How the refusal works

`.is("claimed_by_user_id", null)` sits in the `WHERE` clause next to
`.eq("owner_user_id", …)`. That is the whole guard, and it is race-free for the
same reason claiming is: a claim landing first stops the row from matching. **It
must never become a read-then-write.**

The claimer id is read **only after** the write matched nothing, and only to
choose the wording. That is `lookUpRefusal` — the one owner-serving path allowed
to select the column. The value never leaves the function.

What the owner sees is
[UI patterns → A refusal ends the dialog](ui-patterns.md#a-refusal-ends-the-dialog).

## When the secret ends

A claim is a secret. A gift that has been handed over is not.

The buyer presses **Darované**, either on *Čo kupujem* or on the owner's list
itself beside *Toto nekupujem*. Both are the same control and neither is
available to the owner: the button lives in the visitor's branch of the page,
which is handed no claim state at all when the reader is the owner.

The wish is deleted and a row is written to `fulfilled_wishes` naming both
people to each other. This is the only place an owner is told who bought them
something, and it is not a leak: by the time the button is pressed, the gift is
in their hands.

### Four invariants

1. **Only the holder ends it.** `fulfilled_wishes` is written by `fulfil_wish`
   and nothing else, and `fulfil_wish` matches on `claimed_by_user_id =
   p_giver_id` and nothing else. An app that ends the secret on the giver's
   behalf has taken the one decision that was theirs.
2. **`fulfilled_wishes` holds no live claims**, by construction: a row exists
   only because the wish it describes was deleted in the same statement. So
   `/received` can never become an oracle for what is currently reserved.
3. **The `revoke execute` in `0007_fulfilled_wishes.sql` is load-bearing.**
   Postgres grants `EXECUTE` to `PUBLIC`, so without it anyone holding the anon
   key could call `fulfil_wish` from devtools — past the zero-policy wall,
   because a function is not a table. `PUBLIC` includes `service_role`, so the
   revoke is always paired with an explicit grant back.
4. **The owner's count falling is accepted.** They learn "one of mine was bought
   and given", which is exactly what they already know, because they are holding
   it.

### The second accepted hole

A giver who presses **Darované** before actually handing the gift over spoils
their own surprise, live, in the owner's open tab.

The mitigation is the confirmation dialog's second sentence and nothing else.
This is deliberately not a code problem: no delay, no scheduling, no "hold until
December". Any of those would mean the app deciding when a gift was given, which
it cannot know.

### History is not a wish

*Never select `claimed_by_user_id` on an owner-serving path* stands exactly as
written: `/received` reads a different table and learns nothing about any live
claim. The names on a record are snapshots taken at handover, so the record
outlives any group either party is in —
[Wishes, claims and history](wishes-claims-history.md#the-two-pages).

## Three accepted holes

All three are deliberate, and none is an argument for weakening the rule
anywhere else.

1. **An owner who tries to delete every wish learns which are taken** —
   [above](#this-is-a-known-accepted-hole).
2. **A giver can spoil the surprise early** —
   [above](#the-second-accepted-hole).
3. **Removal silently un-reserves gifts.** When somebody is
   [removed from a group](groups-and-invites.md#removing-somebody),
   `memberships_release_claims` releases the claims that group made possible,
   and the gift may already have been bought. Nobody is told, on either side —
   the same choice `0005_drop_claim_notices.sql` made about notices, for the
   same reason: a notice saying "the wish you bought is loose again" is a claim
   notice with extra steps.
