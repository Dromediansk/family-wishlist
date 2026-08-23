# Wishes, claims and history

The lifecycle of one wish, and why each step is shaped the way it is. The rules
themselves are in
[Project context](../project-context.md#business-rules).

## Validation is enforced twice

Zod in the Server Action produces the Slovak messages a person reads; `CHECK`
constraints in the schema mean no path — including a hand-written SQL insert —
can store something the app would refuse. Empty optional fields arrive from a
form as `""` and are stored as `NULL`.

## Editing and deleting

Both carry the same three conditions — id, owner, and unclaimed — and check them
**by not matching**, never by a separate read beforehand. That is what makes the
reserved case race-free.

`updateWish` cannot spell them into a `WHERE` clause, because an edit writes two
tables: the wish's text and its `wish_groups` tags. It calls `update_wish`
instead, which carries the same three conditions on its own `UPDATE` and only
then replaces the tags. Both halves land together or neither does, so a claim
arriving mid-edit cannot leave the text rewritten and the tags stale. The
function returns `NULL` when the guard did not match — the same "no rows" signal
a `.update()` gave, routed to the same refusal.

Refusing a reserved wish is the app's one deliberate exception to the privacy
rule:
[The deliberate exception](privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen).

## Two people claiming at once

The claim is a **conditional update**, not a check followed by a write. If
somebody got there a moment earlier the update matches no rows and its author is
told *"Niekto bol rýchlejší — táto položka je už rezervovaná."* Nothing is
silently overwritten. The refusal is `final`, because pressing the button again
cannot un-reserve it.

## Reading a list

Three shapes come back, decided by who is looking:

| Reader | Gets | Group tags |
|---|---|---|
| The owner | No claim field exists on the type | Their full live tag list — their view is unscoped, so the tags are also *rendered* |
| Everyone else | Claim status, so the row can dim and name the claimer | None — the query is already scoped to one group, so a tag would say nothing |
| Whoever holds the claim, on `/buying` | No claim field either; they hold it and there is nothing to be told | Only tags naming a group the viewer **and** the owner both stand in right now |

The view type is a discriminated union, so a component cannot render the wrong
shape by accident. The row component is handed only what it may display and
cannot reach claim state at all; the caller decides what goes in its `action`
and `tags` slots.

The owner's view is unscoped: they see and can retag every wish they own,
regardless of which groups it currently reaches. Tags naming a group they have
since left are dropped on read, so the picker never has to repair the list.

## What I'm buying

`/buying` lists everything you hold, across every list in every group, newest
first. It carries **no group in its URL**, because a claim is not a group's
business — it is between two people.

Because it spans groups, each row carries the groups the wish reaches as badges
— but only those you and its owner are **both** in right now, checked against
live memberships rather than against the tag list. At least one always survives,
since sharing a group is what let you claim the wish. Badges are hidden entirely
for somebody in a single group, where every row would carry the same one.

Nothing on this page changes underneath you, because an owner cannot edit or
delete a reserved wish. Three things take an item off it: releasing it,
pressing **Darované**, and either of you being
[removed from the group](groups-and-invites.md#removing-somebody) you share.

## Photos

A wish may carry one picture — usually a screenshot of the page selling it,
which survives a link going stale or hiding behind a login.

**The bytes are not in the database.** `wishes.photo_path` holds an object key
in the private `wish-photos` bucket, shaped `{wish id}/{random}.{ext}`:

- The **wish id prefix** makes cleanup a prefix listing. Replacing a photo,
  clearing it, deleting the wish and handing it over are the same operation with
  a different survivor.
- The **random file name** changes on every upload and is the `?v=` token on the
  URL. A new picture is a new URL, which is what lets the route cache for a year
  without ever serving a stale one.

**The browser resizes before anything is sent** — canvas, 1200px longest edge,
re-encoded as WebP. That is not only about size: it is the only reason a photo
taken on an iPhone works at all, since Safari decodes HEIC and nothing on the
server can, and re-encoding discards the EXIF GPS coordinates a phone writes.

**The type the browser puts on a file is a claim, not evidence** — a Server
Action is reachable by direct POST. Magic-byte sniffing is the only thing
allowed to decide what is stored.

**The row is written first, the picture attached second.** An upload that fails
costs the photo and not the wish, and an edit refused because somebody reserved
the wish a moment earlier has uploaded nothing to leave lying around. A failed
upload on *add* is reported as `final`, because the wish is already saved and
pressing again would add a second one.

**Getting one out** is `GET /wish-photo/{wish id}?v={token}`, addressed by wish
id and never by object key, so no key from a URL is ever trusted. Every refusal
is the same 404 and `Content-Type` comes from a whitelist rather than from
anything stored —
[Serving a photo](privacy-rule.md#serving-a-photo).

## Handing the gift over

**Darované** deletes the wish and inserts the history record in one statement.
Either both happen or neither does, so a gift can never be lost between the two.

The record **copies what it needs rather than joining to it**: the title, the
description, the link, both names and the group names.

- **Names come from `app_users`**, never from a per-group label, because a
  record of something that really happened must not depend on a group.
- **Group tags are copied as names, not ids**, because `wish_groups` cascades
  away with the wish in that very statement and a group can be deleted
  afterwards. What is copied is narrower than what the wish carried — only tags
  naming a group both parties stood in at that moment. The statement does the
  narrowing itself rather than taking the page's word for it, which is what lets
  **Darované** be pressed from the owner's list too, where the list is scoped to
  one group and draws no badges at all.
- **The text is a snapshot, not a duplicate.** Referencing the wish would mean
  keeping the row, and then an owner editing their old wish would rewrite the
  giver's history.

Reading `wish_groups` in the statement that deletes the wish is safe: Postgres
data-modifying CTEs share one snapshot and do not see each other's writes. An
empty tag list does not roll the handover back — an untagged record still reads,
which is exactly what the records written before `0010` are.

The photo does not come along. It hung off the wish, so the bucket is swept
exactly as a delete does — the record keeps the words, not the picture.

It is one way. There is no undo, which is why the confirmation says so.

## The two pages

| Route | Title | Shows |
|---|---|---|
| `/buying/history` | *Čo som daroval* | What you gave, `pre: {name}`, newest first |
| `/received` | *Čo som dostal* | What you were given, `od: {name}`, newest first |

`/received` carries **no id in its URL** on purpose. It is the one screen that
names a giver to the person they gave to, so there is nothing to guess and no
ownership guard to get wrong — the caller is always the owner of what it shows.

Both show the date, and it is the only date the app displays; a claim's
timestamp is deliberately never shown. Both span every group, so both carry the
record's group names read off the snapshot rather than resolved —
[A group tag](ui-patterns.md#a-group-tag). A gift handed over before `0010`
shipped has none, and shows none.

Why an owner may be told who gave them something at all:
[When the secret ends](privacy-rule.md#when-the-secret-ends).
