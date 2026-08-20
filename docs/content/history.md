# History

A claim used to have no end. A wish somebody had bought stayed on its owner's
list forever, and the reservation stayed on the buyer's page forever.

**Darované** ends it. The buyer presses it once the gift is in the other
person's hands; the wish is deleted and a permanent record takes its place.

## What happens

One SQL statement — `fulfil_wish` in `0007_fulfilled_wishes.sql` — deletes the
wish and inserts the record together. Either both happen or neither does, so a
gift can never be lost between the two.

The record copies what it needs rather than joining to it: the title, the
description, the link, and **both names**. The names are read from `app_users` —
the account's own name, never a per-group label — because a record of something
that really happened must not depend on a group. Either party can leave the group
they shared, or that group can cease to matter, and the record still reads. If an
account is deleted the ids null out and the names stay.

The [photo](wishes.md#photos) does not come along. It hung off the wish, which
is now deleted, so `fulfilWish` sweeps the bucket exactly as a delete does — the
record keeps the words, not the picture.

It is one way. There is no undo, which is why the confirmation says so.

## The two pages

| Route | Title | Shows |
|---|---|---|
| `/buying/history` | *Čo som daroval* | What you gave, `pre: {name}`, newest first |
| `/received` | *Čo som dostal* | What you were given, `od: {name}`, newest first |

*Čo som daroval* is reached from [*Čo kupujem*](claiming.md#what-im-buying).
*Čo som dostal* is reached from your own list, and only from there.

`/received` carries no id in its URL on purpose. It is the one screen that names
a giver to the person they gave to, so there is nothing to guess and no
ownership guard to get wrong — the caller is always the owner of what it shows.

Both pages show the date, formatted by `formatDate` (`src/lib/utils.ts`). It is
the only date the app displays; a claim's timestamp is deliberately never shown.

Why an owner may be told who gave them something at all is
[The privacy rule → When the secret ends](privacy-rule.md#when-the-secret-ends).
