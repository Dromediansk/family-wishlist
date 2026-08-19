# Claiming

Claiming is how two people avoid turning up with the same gift. You reserve an
item on somebody else's list; everyone except its owner can see that you did.

## The rules

- **You cannot claim off your own list.** Enforced in the action
  (`.neq("member_id", current.id)`) and again by the `no_self_claim` check
  constraint in the schema.
- **One claim per wish.** `claimed_by` is a single column, not a table.
- **Only the holder can release.** `unclaimWish` matches on
  `.eq("claimed_by", current.id)`.
- **The owner is never told.** See [The privacy rule](privacy-rule.md).

`claimed_by` and `claimed_at` are set and cleared together; the
`claim_consistent` constraint makes any other combination unstorable.

## Two people at once

The claim is a **conditional update**, not a check followed by a write:

```
.update({ claimed_by: … }).eq("id", …).is("claimed_by", null).neq("member_id", …)
```

If somebody got there a moment earlier, the second update matches no rows and
its author is told *"Niekto bol rýchlejší — táto položka je už rezervovaná."*
Nothing is silently overwritten. The refusal is marked `final`, because pressing
the button again cannot un-reserve it.

The owner's frozen-wish refusal
([Wishes](wishes.md#editing-and-deleting)) works by exactly the same mechanism.

## What a list looks like to a visitor

For each wish on somebody else's list:

| State | What is shown |
|---|---|
| Free | **Toto kúpim** button |
| Claimed by you | **Toto nekupujem** button (releases it) |
| Claimed by someone else | *Toto kupuje {name}*, no button, row dimmed |

Dimming is 70% opacity rather than 60% — enough to read as "taken, move on"
while keeping the title legible to an older eye.

## The family grid

Each member's card leads with how many of their wishes are still free and keeps
the total behind it, muted: **2 / 5**. The number is green while anything is
left and goes grey once a list is fully reserved.

Your own card, and any empty list, shows a single number instead. The reason,
and the type that enforces it, is in
[The privacy rule](privacy-rule.md#counting-on-the-family-grid).

Your own card sorts first — it is the one you came for, and it is where you add
to your own list. Everyone else follows by name, collated for Slovak so that
Čaňo files after C rather than after Z.

## What I'm buying

`/buying` (*Čo kupujem*) lists everything you hold, across every list, newest
reservation first, with whose list each came from.

An owner cannot edit or delete a reserved wish, so nothing on this page changes
underneath you. Two things take an item off it: releasing it yourself, and
pressing **Darované** once you have handed the gift over — which moves it to
[History](history.md) for good. The third way is out of your hands: the owner
being [removed from the family](membership.md#removing-someone).
