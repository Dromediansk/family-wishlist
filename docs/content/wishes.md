# Wishes

A wish is one thing somebody would like to be given. It lives on exactly one
list — its owner's — and only that owner can put it there.

## What a wish holds

| Field | Required | Limit | Notes |
|---|---|---|---|
| `title` | yes | 1–120 chars | Trimmed. The only thing the form insists on |
| `description` | no | ≤ 1000 chars | Free text, rendered with line breaks kept |
| `url` | no | must match `https?://…` | Shown as a bare hostname, opens in a new tab |

Validation is enforced twice on purpose: Zod in
[`src/app/actions/wishes.ts`](../../src/app/actions/wishes.ts) produces the
Slovak messages a person reads, and `CHECK` constraints in `0001_init.sql` mean
no path — including a hand-written SQL insert — can store something the app
would refuse.

Empty optional fields arrive from a form as `""`; they are stored as `NULL`.

## Who can do what

| Action | Who | Refused when |
|---|---|---|
| Add | the owner, to their own list | never (only validation can fail) |
| Edit | the owner | somebody has reserved it |
| Delete | the owner | somebody has reserved it |
| Claim / release | anyone **except** the owner | see [Claiming](claiming.md) |

The owner is never taken from anything the browser sends. Every action
re-derives the caller from their session and puts `member_id` in the `WHERE`
clause, so someone else's wish simply does not match.

## Editing and deleting

Both actions carry two conditions in the same `WHERE` clause:

```
.eq("id", …).eq("member_id", current.id).is("claimed_by", null)
```

Ownership and reservation are checked the same way — by not matching — rather
than by a separate read beforehand. That is what makes the reserved case
race-free.

Refusing a reserved wish is the app's one deliberate exception to the privacy
rule, and it is documented in full at
[The privacy rule → The deliberate exception](privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen).

Because a reserved wish can no longer change or vanish, nothing on
[*Čo kupujem*](claiming.md#what-im-buying) can disappear from under its buyer —
with one exception, [removing a member](membership.md#removing-someone).

## Reading a list

Two shapes come back, decided by who is looking:

- **The owner** gets `OwnerWish[]` — no claim fields exist on the type.
- **Everyone else** gets `ViewerWish[]` — claim status included, so the row can
  show *Toto kupuje Zuzana* and dim itself.

`WishListView` is a discriminated union, so a component cannot render the wrong
view by accident. `WishRow` itself is handed only `Displayable` (title,
description, url) and cannot reach claim state at all; the caller decides what,
if anything, goes in the row's action slot.

Wishes are ordered oldest first, on every list.

## Errors and results

Every Server Action returns an `ActionResult` rather than throwing. Expected
failures are values.

```ts
type ActionResult =
  | { ok: true }
  | { ok: false; error: string; final?: boolean }
```

`final` means *this call will fail the same way however often it is repeated*.
A reserved-wish refusal is final; a validation message or a dropped connection
is not. What the UI does with that distinction is in
[UI patterns](ui-patterns.md#a-refusal-ends-the-dialog).
