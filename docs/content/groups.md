# Groups

A group is a circle of people who read each other's lists — a family, a team, a
group of friends. It is the unit of *who can see whom*, and nothing else in the
app decides that question.

## One account, several groups

Signing in with Google produces one identity, an `app_users` row, and that row
is who you are everywhere. Belonging is separate: a `memberships` row says "this
account is in this group", and one account may hold as many as it likes.

An account with no membership at all is a perfectly legal state — `groupless` in
[`resolveAccess`](../../src/lib/access.ts) — and `/start` is the screen that
serves it. Nobody is ever kept waiting for permission, because there is nothing
to wait for.

**A wish list belongs to a person, not to a group.** `wishes.owner_user_id`
points at an account, so the list you keep is one list, and everyone in *any* of
your groups reads the same one. That is what a person-level list means, and it
is written down as one of the rule's accepted holes —
[The privacy rule](privacy-rule.md#four-accepted-holes).

Which group you are currently reading comes from the path: group-scoped screens
live under `/g/{group id}`, and the switcher in the header moves between them.
`/` owns no screen of its own — it sends you to the first group you joined, or to
`/start` if you have none. `/buying`, `/buying/history` and `/received` stay at
the top level, because a claim and a gift span groups.

## Names are per group

`memberships.name` is what people call you *here*: "Miro" to the family,
"Miroslav Pillár" to colleagues. A new membership starts from the name Google
supplied, and an admin can rename anybody in their own group afterwards. Names
are **not unique** — two people really can be called Ján Novák. Identity is the
account; a name is a label on a card.

On the screens that belong to no one group there is no current label to use, so
`preferredName` ([`src/lib/visibility.ts`](../../src/lib/visibility.ts)) falls
back to the name from whichever shared group **the viewer** joined first. Keyed
off the viewer rather than the person being named, so one screen names everybody
through the same group and cannot contradict itself.

## Roles are per group

| Role | Can |
|---|---|
| member | add wishes to their own list, claim from others, create an invite |
| admin | all of the above, plus rename, promote, demote and remove, and revoke anybody's invite |

An admin of one group is an ordinary member of another. Every check takes the
group it is deciding about — `isGroupAdmin` reads the role on the
`GroupContext` that `enterGroup` built, and being an admin elsewhere is not
cover for anything.

**There must always be at least one admin in a group.** The last one cannot be
demoted or removed; otherwise nobody could ever manage that group again and the
only way back would be the database.

*Spravovať rodinu* appears in the account menu only inside a group where you are
its admin, but a hidden menu item is not a guard: `/g/{group id}/family`
re-checks with `isGroupAdmin` in its own body and redirects, and every action
behind it re-checks for itself.

## Getting in

`/start` is the only door, and it offers exactly two things: create a group, or
open an invite somebody sent you. There is no group directory, no search and no
join request — a group you have not been invited to is not addressable.

Whoever creates a group is its admin. That is the only way to become one without
being promoted.

### The creation cap

An account may create at most `MAX_GROUPS_PER_ACCOUNT`
([`src/lib/groups.ts`](../../src/lib/groups.ts)) groups — five. The count is
`groups.created_by`, which holds an `app_users.id`, so **leaving a group does not
give the budget back**: the row still records who brought it into existence.

The number is cheap insurance rather than a derived limit, which is why it is a
constant and not a setting. It is the one guard here built for a threat the
invite-only design does not have yet.

### Invites

**Any member may open the door**, not only an admin. The person who wants to add
a cousin is usually not the admin, and needing one to be awake is a milder
version of the queue this app deliberately has no room for.

An invite is a link — `/join/{token}` — and it carries:

| Field | Value |
|---|---|
| `token` | 32 random bytes, base64url. Stored in plaintext |
| `expires_at` | 30 days from creation |
| `max_uses` | never set by the app, so every invite is unlimited-use |
| `uses` | how many joins it has admitted |
| `revoked_at` | set by a revoke, which is the only way to close a link early |
| `created_by` | the creator's **membership**, never their account |

The token is plaintext so that a link already sent can be copied again. Hashing
would defend only against a read-only leak of a database that already holds
every wish the token grants access to.

`created_by` being a membership id is enforced by the database:
`invites_creator_in_group` is a composite foreign key onto
`(memberships.id, group_id)`, so an invite cannot exist unless its creator is in
the group it admits people to. Note the trap — `groups.created_by` is an
`app_users.id` and `invites.created_by` is a `memberships.id`. Two id spaces,
one column name; the branded types are what keep them apart in TypeScript.

**Opening a valid link while signed in joins the group immediately.** No
approval, no waiting screen, nothing for an admin to do. Opening one for a group
you are already in is a no-op that does not spend a use. The route handler at
[`src/app/join/[token]/route.ts`](../../src/app/join/%5Btoken%5D/route.ts) only
decides *where* to send the browser; `joinWithInvite` re-derives all of it,
because a Server Action is reachable on its own.

Somebody who is not signed in yet — the normal case for a first invite — is sent
to `/login` with the path they were trying to reach, and lands back on it once
Google is done. Two things make that safe to carry:

- `safeReturnTo` ([`src/lib/invites.ts`](../../src/lib/invites.ts)) accepts
  `/join/{token}` and nothing else. The value comes off a query string, so
  without an allow-list `/login` would be an open redirect; with one, an absolute
  URL, a protocol-relative `//host` and any other path are all refused by simply
  not matching. It is checked again inside the sign-in action, because a form
  field is a claim and not proof.
- The path rides in an httpOnly cookie, not in the OAuth `redirect_to`. The token
  in it *is* permission to join this group, and it has no business in Google's
  URL, logs or the browser's history. The cookie lasts ten minutes and is spent
  on arrival.

`inviteUsable` ([`src/lib/invites.ts`](../../src/lib/invites.ts)) is the single
answer to "is this still a door", and a revoked, expired or exhausted link gets
one sentence — *Táto pozvánka už neplatí.* — wherever it is refused.

**Revoking.** A group admin may revoke any invite to their group; anybody may
revoke one they created themselves, because nobody should be unable to undo
their own action. `canRevokeInvite` is the one spelling of that rule, and the
update that follows is scoped to the group in its own `WHERE` clause.

#### Before exposing a use limit

`max_uses` exists as a column and `inviteUsable` honours it, but nothing in the
app ever sets it. Putting a cap in the UI needs one thing first:
**`joinWithInvite` admits before it counts.** It checks usability, inserts the
membership, and only then increments `uses`, so two people opening the last use
of a capped link at the same instant can both be admitted.

The counter itself is race-free — `markInviteUsed` is a compare-and-swap on the
value it just read, so the count cannot drift. Admission is what is not.
Whoever adds a cap owes it an atomic check-and-admit, in the shape of
`fulfil_wish`: one statement that decides and acts together.

## Removing somebody

Only an admin can, and it deletes **their membership and nothing else**.

Their wishes are theirs, not the group's. Nothing cascades, no photo is pruned,
and their other groups go on reading the same list they always did.

What does change is claims. `memberships_release_claims` fires on any membership
delete and releases every claim between two people who no longer share a group —
in both directions, so a claim they held and a claim held on them both go. The
reservation simply disappears, and nobody is told: the gift may already have
been bought. That silence is deliberate and it has a precedent —
`0005_drop_claim_notices.sql` made the same choice about telling a buyer their
wish had gone. It is written down as an accepted hole in
[The privacy rule](privacy-rule.md#four-accepted-holes).

Their **history** survives. `fulfilled_wishes` copies both names from
`app_users` rather than joining to them, so a record stays readable whoever
leaves — see [History](history.md).

## What is deliberately missing

- **Nobody can leave a group themselves.** An admin can remove a member; a
  member cannot remove themselves. Asking an admin is the only exit.
- **A group cannot be deleted.** Not from the app, at any rate.
- **A signed-out visitor who opens a dead link lands on a bare `/login`.**
  `/join/{token}` sends them to `/start` with the refusal in the query string,
  but `src/proxy.ts` strips the query when it bounces a visitor with no session,
  so the sentence never reaches a screen. They see a login page and no
  explanation. A *valid* link does resume — only the refusal is lost.

The plumbing for self-leave is already there — `memberships_release_claims`
fires on any membership delete, whoever caused it — so it is a small later change
rather than a design problem.

### A known gap where the two combine

Each of the following is intentional and documented on its own, but nothing
records what they add up to together:

- **Opening a valid invite link joins you on a GET, with no confirmation
  screen.** That is deliberate — see [Invites](#invites) above: the person
  sending the link wants the door to open on the first click, not after an
  admin wakes up or a second screen is dismissed.
- **Nobody can leave a group themselves**, just above: only an admin can
  remove a member.

Put together: one click on a link a stranger sent — in a chat message, an
email, anywhere — puts you in their group, where they can read your entire
wish list, and the only way out is asking *their* admin, who may be the
stranger themselves. Sending yourself the same link back does not undo it;
`joinWithInvite` has no opposite.

An `<img>` tag pointing at the join URL does **not** pull this off silently —
joining writes a session-backed membership row, which needs the visitor's own
`sameSite: "lax"` auth cookie, and a browser withholds a `Lax` cookie from a
subresource request. It takes an actual top-level navigation: a real link
click, a redirect, or the address bar.

Two changes would close it, and neither belongs to a fix wave — each is a
product call for the repository's owner:

1. A confirmation step before the join is committed, so opening the link shows
   who is asking before it acts.
2. Letting a member leave a group themselves, so admission without asking
   is not also a life sentence.
