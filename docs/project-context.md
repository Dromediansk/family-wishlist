# Project context

What this app is for, and the rules it must obey. Stable — this file changes
when a *decision* changes, not when code does.

For how it is built, see [Technical context](technical-context.md).

## Purpose

People in a family, a team or a circle of friends buy each other gifts and
duplicate them. The obvious fix — a shared list — spoils the surprise, because
whoever keeps the list can see what has been reserved from it.

This app keeps the list and the surprise at the same time. Everyone writes down
what they'd like; everyone else can quietly reserve an item; the owner is never
told.

## Domain

- **Private circles, invite-only.** No directory, no search, no join request. A
  group you have not been given a link to is not addressable.
- **Slovak and English.** Slovak is what it was written in and what an
  unrecognised browser gets; English is chosen from the avatar menu, or by a
  browser that asks for it. Every user-facing string is in both, validation
  messages included.
- **Grandparents on phones.** The primary reader has low vision and a small
  screen. That drives the typeface, the tap targets and the dialog behaviour.
- **One person's side project.** It runs on free tiers and is administered by
  hand. No ops team, no on-call, no support inbox.
- **Not commercial.** No payments, no analytics, no accounts to monetise, no
  data to sell.

## Goals

| Goal | Means |
|---|---|
| The surprise survives | The privacy rule below, held in code rather than in the database |
| Nobody waits for permission | An invite link *is* the permission — opening it joins instantly |
| One account, several circles | Per-group names and roles; a list belongs to a person, not a group |
| Every tab stays current | Live updates that say *something changed* and nothing more |
| Readable at arm's length | Atkinson Hyperlegible, 62ch measure, phone-first dialogs |
| Installable | PWA, no service worker |

Explicit non-goals: real-time collaboration, comments, wish reordering,
priorities, prices, notifications, and any form of self-service group discovery.

## Entities

| Entity | Table | Is |
|---|---|---|
| **Account** | `app_users` | One per Google account. Identity, and nothing per group. Holds the email and the seed name Google supplied |
| **Group** | `groups` | A circle of people who read each other's lists. The unit of *who can see whom* |
| **Membership** | `memberships` | One per (account, group). Where belonging lives, and with it the **per-group name** and **role** |
| **Invite** | `invites` | A token link admitting anyone who opens it into one group |
| **Wish** | `wishes` | One thing somebody would like. Belongs to an **account**, not a group |
| **Wish tag** | `wish_groups` | One per (wish, group). Which of the owner's groups may see that wish |
| **Group note** | `group_notes` | One person's private notebook for one group. Keyed on the membership, so it cannot outlive one |
| **Claim** | *(columns on `wishes`)* | A reservation. Not a table — `claimed_by_user_id` and `claimed_at`, set and cleared together |
| **Fulfilled wish** | `fulfilled_wishes` | An immutable record written when a gift is handed over. Copies names and group names rather than joining to them, so it outlives both |

Two things follow from the shapes above and are easy to get wrong:

- **A wish list is one list, not one per group.** `wishes.owner_user_id` points
  at an account. `wish_groups` narrows who sees each wish.
- **`groups.created_by` is an account id; `invites.created_by` is a membership
  id.** Two id spaces, one column name.

## Business rules

### The one rule

> **A list owner must never learn who claimed one of their own wishes, and must
> never be shown claims while reading their own list. The secret ends only when
> the giver ends it, by marking the gift handed over — and never any other way.**

Everyone else sees claims. The owner does not. Every unusual decision in this
codebase follows from that sentence.

- **One deliberate exception.** An owner cannot edit or delete a **reserved**
  wish, and the refusal says so — without saying by whom. Do not hide that
  refusal, and do not extend it by showing claim state on the owner's list.
- **Only the holder of a claim may end the secret**, by pressing *Darované*.
  No admin override, no cron, no date.
- **Three accepted holes**, all deliberate. An owner who tries to delete every
  wish learns which are taken; a giver can spoil the surprise by pressing
  *Darované* early; removing somebody from a group silently un-reserves gifts.

Rationale, enforcement and the holes in full:
[decisions/privacy-rule.md](decisions/privacy-rule.md).

### Wishes

- A wish belongs to one account and appears on exactly one list.
- Only its owner may add, edit or delete it.
- It must be tagged with **at least one** of its owner's groups, and only the
  owner chooses the tags.
- It ends three ways and only three: the owner deletes it while unreserved; the
  claim holder marks it handed over; the account is deleted.
- Lists are ordered oldest first, everywhere.

### Notes

- A note belongs to one person **in one group**, and only that person ever
  reads it. It is never shown to anybody else, in any view.
- Because nobody else reads it, it is outside the one rule rather than an
  exception to it — there is no note a list owner could learn a claim from.
- Emptying a note deletes it. There is no such thing as an empty note.
- It ends with the membership: being removed from the group, the group being
  deleted, or the account being deleted all take it. Rejoining starts blank.

### Claiming

- You may claim only a wish tagged with a group **you** are in.
- You may never claim from your own list.
- One claim per wish. Whoever writes first wins; the loser is told so.
- Only the holder may release a claim.
- The owner is never told, in either direction.

### Groups and membership

- Membership is the only thing that decides who may see whom.
- Names and roles are **per group**. An admin of one group is an ordinary
  member of another.
- **A group always has at least one admin.** The last one cannot be demoted or
  removed.
- **Only an admin may mint an invite.** The link is an unlimited-use key to
  every wish in the group, good for 24 hours. Opening it while signed in joins
  immediately — nothing to approve.
- Anyone may revoke an invite they created; an admin may revoke any invite to
  their group.
- An account may **create** at most 5 groups. Deleting one gives the budget
  back; leaving one does not.
- **Nobody can leave a group themselves.** Asking an admin is the only exit.
- Removing somebody deletes their membership and their notes for that group.
  Their wishes, photos and history are untouched.
- Any admin may delete the group. It takes the memberships, the notes written
  for it and the invites, and nothing else.

### History

- A fulfilled record is written by one statement that also deletes the wish, so
  a gift can never be lost between the two.
- It is **immutable and self-contained**: both names, the wish's text and the
  group names are copied, never joined. It survives either party leaving the
  group, the group being deleted, and an account being deleted.
- There is no undo.
- It is the only place an owner is told who gave them something, and by then
  the gift is in their hands.

### Identity

- Sign-in is Google, and it proves an identity — never a membership.
- An account in no group is a legal state, not an error. It sees `/start`.
- Names are **not unique**. Identity is the account.
