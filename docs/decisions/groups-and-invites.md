# Groups and invites

Why belonging is shaped the way it is. The rules themselves are in
[Project context](../project-context.md#groups-and-membership).

## A list belongs to a person, not a group

`wishes.owner_user_id` points at an account, so the list you keep is one list,
not one per group. What each group's members see of it is narrower than the
whole: `wish_groups` tags every wish with which of the owner's groups can see
it, at least one, and the owner alone decides the tagging.

An account with no membership at all is a perfectly legal state, and `/start` is
the screen that serves it. Nobody is ever kept waiting for permission, because
there is nothing to wait for.

Which group you are reading comes from the path: group-scoped screens live under
`/g/{group id}`. `/` owns no screen of its own — it sends you to the first group
you joined, or to `/start`. `/buying`, `/buying/history` and `/received` stay at
the top level, because a claim and a gift span groups.

## Names are per group

`memberships.name` is what people call you *here*: "Miro" to the family,
"Miroslav Pillár" to colleagues. A new membership starts from the name Google
supplied. Names are **not unique** — two people really can be called Ján Novák.
Identity is the account; a name is a label on a card.

On screens that belong to no one group there is no current label to use, so the
fallback is the name from whichever shared group **the viewer** joined first.
Keyed off the viewer rather than the person being named, so one screen names
everybody through the same group and cannot contradict itself.

## Roles are per group

Every check takes the group it is deciding about, and being an admin elsewhere
is not cover for anything.

**There must always be at least one admin.** The last one cannot be demoted or
removed; otherwise nobody could manage that group again and the only way back
would be the database.

*Spravovať rodinu* appears in the account menu only where you are an admin, but
a hidden menu item is not a guard: the page re-checks in its own body and
redirects, and every action behind it re-checks for itself.

## The creation cap

An account may create at most `MAX_GROUPS_PER_ACCOUNT` groups — five. The count
is `groups.created_by`, so **leaving a group does not give the budget back**:
the row still records who brought it into existence. **Deleting one does**, for
the same reason read the other way round.

The number is cheap insurance rather than a derived limit, which is why it is a
constant and not a setting. It is the one guard here built for a threat the
invite-only design does not have yet.

## Invites

**Only an admin may open the door.** The link *is* the permission — an
unlimited-use key to every wish in the group, good for 24 hours — so minting one
is group management. Only the cutting of a key is restricted, never the opening:
whoever holds the link joins instantly, and there is nothing to approve
afterwards.

| Field | Value |
|---|---|
| `token` | 32 random bytes, base64url. Stored in **plaintext** |
| `expires_at` | 24 hours from creation |
| `max_uses` | never set by the app, so every invite is unlimited-use |
| `uses` | how many joins it has admitted |
| `revoked_at` | set by a revoke, the only way to close a link early |
| `created_by` | the creator's **membership**, never their account |

The token is plaintext so that a link already sent can be copied again. Hashing
would defend only against a read-only leak of a database that already holds
every wish the token grants access to.

`created_by` being a membership id is enforced by a composite foreign key onto
`(memberships.id, group_id)`, so an invite cannot exist unless its creator is in
the group it admits people to. Note the trap: `groups.created_by` is an account
id and `invites.created_by` is a membership id. Two id spaces, one column name;
the branded types are what keep them apart.

**Opening a valid link while signed in joins immediately.** Opening one for a
group you are already in is a no-op that does not spend a use. Somebody not
signed in yet — the normal case for a first invite — is sent to `/` with
the path they were trying to reach. Two things make that safe to carry:

- An allow-list accepts `/join/{token}` and nothing else. The value comes off a
  query string, so without one the sign-in page would be an open redirect. It is checked
  again inside the sign-in action, because a form field is a claim, not proof.
- **The path rides in an httpOnly cookie, not in the OAuth `redirect_to`.** The
  token in it *is* permission to join, and it has no business in Google's URL,
  logs or the browser's history. The cookie lasts ten minutes.

A revoked, expired or exhausted link gets one sentence — *Táto pozvánka už
neplatí.* — wherever it is refused.

**Revoking.** An admin may revoke any invite to their group; anybody may revoke
one they created, because nobody should be unable to undo their own action. An
invite whose creator is an ordinary member predates the admin-only rule. Those
links were left alive rather than revoked wholesale, because one already sent is
somebody's way in — but no screen offers a member that control any more.

### Before exposing a use limit

`max_uses` exists as a column and is honoured, but nothing sets it. Putting a
cap in the UI needs one thing first: **admission happens before counting.**
Usability is checked, the membership inserted, and only then is `uses`
incremented — so two people opening the last use of a capped link at the same
instant can both be admitted.

The counter itself is race-free (compare-and-swap on the value just read).
Admission is what is not. Whoever adds a cap owes it an atomic check-and-admit,
in the shape of `fulfil_wish`: one statement that decides and acts together.

## Removing somebody

Only an admin can, and it deletes **their membership and nothing else**. Their
wishes are theirs, not the group's. Nothing cascades, no photo is pruned, and
their other groups go on reading the same list.

What does change is claims. `memberships_release_claims` fires on any membership
delete and, for every wish the departing membership touches, checks whether the
claimer is still in any group that wish is tagged with — releasing the claim if
not, in both directions. The reservation disappears and nobody is told: the gift
may already have been bought. That silence is deliberate, has a precedent in
`0005_drop_claim_notices.sql`, and is written down as an accepted hole in
[The privacy rule](privacy-rule.md#three-accepted-holes).

Their **history** survives — it copies both names rather than joining to them.

## Deleting a group

**Any admin may end it**, from the foot of the family page, behind a rule so the
one irreversible control does not sit among the everyday ones. One `AlertDialog`
is the whole ceremony: it names the group, says how many people lose access, and
its confirm button is the only red one in the app. No typed name, no second
step; a group is a circle of people, not a production database.

Not the creator alone. Every other control on that page is "admin of *this*
group", and one more spelling of who may do what would be a rule to keep in step
rather than a safeguard.

**The database does almost all of it.** `memberships.group_id` and
`invites.group_id` are both `ON DELETE CASCADE`, so one `delete` takes every
membership and every invite, and `memberships_release_claims` fires on each
cascaded membership. The cascade removes rows one at a time, but both
memberships cannot survive it, so no release is missed.

**Nothing else moves.** Wishes, photos and `fulfilled_wishes` are untouched, and
neither table even has a group to cascade from.

Afterwards the browser goes to `/`, which lands on the first remaining group or
`/start`. The redirect `replace`s rather than pushes: the URL being left is a
group that no longer exists, so Back must not offer it again. Everyone else's
tab gets the usual content-free ping, which still arrives because the channel is
named by the group id and not by the row.

## What is deliberately missing

- **Nobody can leave a group themselves.** An admin can remove a member; a
  member cannot remove themselves. The plumbing is already there —
  `memberships_release_claims` fires on any membership delete, whoever caused
  it — so this is a small later change rather than a design problem.
- **A signed-out visitor who opens a dead link lands on a bare `/`.** The
  join route sends them to `/start` with the refusal in the query string, but
  `src/proxy.ts` strips the query when it bounces a visitor with no session, so
  the sentence never reaches a screen. A *valid* link does resume; only the
  refusal is lost.

### A known gap where the two combine

Each of the following is intentional on its own:

- **Opening a valid invite link joins you on a GET, with no confirmation
  screen** — the sender wants the door to open on the first click.
- **Nobody can leave a group themselves.**

Put together: one click on a link a stranger sent puts you in their group, where
they can read your entire wish list, and the only way out is asking *their*
admin, who may be the stranger. Sending yourself the same link back does not
undo it; there is no opposite of joining.

An `<img>` tag pointing at the join URL does **not** pull this off silently.
Joining writes a session-backed membership row, which needs the visitor's own
`sameSite: "lax"` auth cookie, and a browser withholds a `Lax` cookie from a
subresource request. It takes an actual top-level navigation.

Two changes would close it, and each is a product call rather than a fix:

1. A confirmation step before the join is committed.
2. Letting a member leave a group themselves, so admission without asking is
   not also a life sentence.
