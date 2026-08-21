# Wishes

A wish is one thing somebody would like to be given. It lives on exactly one
list — its owner's — and only that owner can put it there.

## What a wish holds

| Field | Required | Limit | Notes |
|---|---|---|---|
| `title` | yes | 1–120 chars | Trimmed. The only thing the form insists on |
| `description` | no | ≤ 1000 chars | Free text, rendered with line breaks kept |
| `url` | no | must match `https?://…` | Shown as a bare hostname, opens in a new tab |
| `photo_path` | no | one image, ≤ 2 MiB | The Storage object key, not the bytes — see [Photos](#photos) |

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
re-derives the caller from their session and puts `owner_user_id` in the `WHERE`
clause, so someone else's wish simply does not match. A wish hangs off an
account, not a group — ownership needs no group id at all — but a separate
`wish_groups` table decides *who else* can see it: the owner picks which of
their own groups a wish is tagged visible in, at least one, and can change it
any time it is not reserved — [Groups](groups.md).

## Editing and deleting

Both actions carry the same three conditions:

```
id = … and owner_user_id = viewer.userId and claimed_by_user_id is null
```

Ownership and reservation are checked the same way — by not matching — rather
than by a separate read beforehand. That is what makes the reserved case
race-free.

`deleteWish` spells them straight into its `WHERE` clause:

```
.eq("id", …).eq("owner_user_id", viewer.userId).is("claimed_by_user_id", null)
```

`updateWish` cannot, because an edit now writes two tables: the wish's text and
its `wish_groups` tags. So it calls one Postgres function instead —
`update_wish(p_wish_id, p_owner_id, p_title, p_description, p_url,
p_group_ids)`, which carries those same three conditions on its own `UPDATE`,
and only if that matched replaces the wish's tags. Both halves land together or
neither does, so a claim arriving mid-edit cannot leave the text rewritten and
the tags stale — [Database](../setup/database.md#functions-and-triggers).

The function returns the wish id, or `NULL` when the guard did not match, which
is the same "no rows" signal a `.update()` gave and routes to the same
`lookUpRefusal`.

Refusing a reserved wish is the app's one deliberate exception to the privacy
rule, and it is documented in full at
[The privacy rule → The deliberate exception](privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen).

Because a reserved wish can no longer change or vanish, nothing on
[*Čo kupujem*](claiming.md#what-im-buying) can disappear from under its buyer —
with one exception, [being removed from the group](groups.md#removing-somebody)
the two of them share.

## How a wish ends

Three ways, and only three:

| Ending | Who | What is left |
|---|---|---|
| Deleted | the owner, while it is unreserved | nothing |
| **Darované** | the person holding the claim | a permanent record in [History](history.md) |
| The account goes | whoever deletes it under **Authentication** in the Supabase dashboard | nothing, for every list at once |

The second is the only one that outlives the wish, and the only one an owner
cannot do. The third is not a feature: it cascades from `auth.users` through
`app_users` and is the only way to bar somebody outright. Removing them from a
group takes nothing but the membership —
[Groups](groups.md#removing-somebody).

## Reading a list

Two shapes come back, decided by who is looking:

- **The owner** gets `OwnerWish[]` — no claim fields exist on the type.
- **Everyone else** gets `ViewerWish[]` — claim status included, so the row can
  show *Toto kupuje Zuzana* and dim itself.

`WishListView` is a discriminated union, so a component cannot render the wrong
view by accident. `WishRow` itself is handed only `Displayable` (id, title,
description, url, photo) and cannot reach claim state at all; the caller decides
what, if anything, goes in the row's action slot.

For everyone but the owner, the list is also scoped to the group they're
viewing it from: a wish tagged for a different one of the owner's groups does
not appear, even to someone who is a peer of the owner through that other
group. The owner's own view is unscoped — they see and can retag every wish
they own, regardless of which groups it currently reaches.

Wishes are ordered oldest first, on every list.

## Photos

A wish may carry one picture — a photo of the thing, or more often a screenshot
of the page selling it, which survives a link going stale or hiding behind a
login.

### Where the bytes live

Not in the database. `wishes.photo_path` holds an object key in the private
`wish-photos` Storage bucket, shaped `{wish id}/{random}.{ext}`:

- The **wish id prefix** is what makes cleanup a prefix listing. Replacing a
  photo, clearing it, deleting the wish and [handing it over](history.md) are
  the same operation with a different survivor, which is the whole of
  `pruneWishPhotos` ([`src/lib/photos.ts`](../../src/lib/photos.ts)).
- The **random file name** changes on every upload, and is the `?v=` token on
  the photo's URL. A new picture is therefore a new URL, which is what lets the
  route cache for a year without ever serving a stale one.

The bucket is private and carries no policy, like every table. Only the
`service_role` client can reach it.

### Getting one in

The browser does the work before anything is sent
([`src/lib/resize-image.ts`](../../src/lib/resize-image.ts)): the picked file is
drawn into a canvas at most 1200px on its longest edge and re-encoded as WebP.

That is not only about size. It is also the only reason a photo taken on an
iPhone works at all — Safari decodes HEIC, which nothing on the server can — and
re-encoding discards EXIF, so the GPS coordinates a phone writes into a photo
never leave the device.

The result travels as a `File` argument to `addWish` / `updateWish`, inside the
Server Action's own request body. `serverActions.bodySizeLimit` in
`next.config.ts` is raised from Next's 1MB default to leave room.

The type the browser puts on a file is a claim, not evidence — a Server Action
is reachable by direct POST. `sniffImageType`
([`src/lib/images.ts`](../../src/lib/images.ts)) reads the magic bytes and is the
only thing allowed to decide what is stored.

### Writing order

The row is always written first and the picture attached second
(`attachPhoto` in [`src/app/actions/wishes.ts`](../../src/app/actions/wishes.ts)).
Both halves stay honest that way: an upload that fails costs the photo and not
the wish, and an edit refused because somebody reserved the wish a moment
earlier has uploaded nothing to leave lying around.

A failed upload on **add** is reported as `final`, because the wish itself is
already saved and pressing the button again would add a second one.

### Getting one out

`GET /wish-photo/{wish id}?v={token}`
([`src/app/wish-photo/[wishId]/route.ts`](../../src/app/wish-photo/%5BwishId%5D/route.ts)).
It re-derives the caller exactly as a Server Action does, and `getWishPhotoPath`
reads the photo's path together with its tagged groups so that a wish not
tagged with any group the caller belongs to is refused. Every refusal is the
same 404 — a missing photo, a stranger's wish and a malformed id are
indistinguishable — and `Content-Type` comes from a whitelist rather than from
anything stored. It is one of the places the privacy rule is enforced —
[Serving a photo](privacy-rule.md#serving-a-photo).

Addressed by wish id, never by object key, so no key from a URL is ever trusted.

The list shows the photo as a thumbnail that opens the full picture in a dialog,
never in a new tab —
[Looking at a photo](ui-patterns.md#looking-at-a-photo).

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
