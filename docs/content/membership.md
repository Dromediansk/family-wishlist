# Membership and roles

## Anyone can sign in; only an admin can let them in

Google will hand a session to any account in the world, and Supabase does not
restrict which accounts may complete the OAuth flow. So signing in is not the
door — **approval is**.

A first-time arrival lands on a waiting screen and sees nothing else until an
admin approves them. Check the email address before approving; that step is what
makes this a family app rather than a public one.

## The three states

| State | Means | Sees |
|---|---|---|
| `anonymous` | no session, or a session with no member row | `/login` |
| `pending` | signed in, waiting for approval | the waiting screen only |
| `active` | approved | the app |

`resolveAccess` ([`src/lib/access.ts`](../../src/lib/access.ts)) is the single
place these are decided, and every page routes off it. It is a pure function
over already-fetched values, so it is unit-tested for real rather than through
mocks.

A signed-in user with **no** member row is treated as anonymous. That only
happens if the row was deleted out from under a live session — see
[Rejoining the queue](#rejoining-the-queue).

## The first person becomes the admin

Otherwise nobody could ever approve anybody and the app would be a locked door
with the key inside.

This is done by a database trigger (`handle_new_auth_user` in `0003_auth.sql`),
not in application code, for two reasons:

- **No gap.** The trigger fires on `INSERT` into `auth.users`, so you cannot
  exist as an auth user without existing as a member. Creating the row in the
  callback route would leave a window where a signed-in user has a session and
  no member row, and every page would have to cope with that state.
- **No bootstrap race.** Two people signing in at the same instant would both
  read "there are no members yet" in application code. Inside the trigger, the
  row lock on the insert means one of them sees the other's row.

The display name comes from the Google profile, falling back to `name`, then the
local part of the email, then `Bez mena`. Names are **not unique** — two people
really can be called Ján Novák. Identity is `auth_user_id`; the name is a label
on a card.

## Roles

| Role | Can |
|---|---|
| member | add wishes to their own list, claim from others |
| admin | all of the above, plus approve arrivals, rename, promote, demote and remove |

**There must always be at least one active admin.** The last one cannot be
demoted or removed. A `pending` admin does not count as cover, since they cannot
let anyone in.

The *Spravovať rodinu* menu item is hidden from non-admins, but a hidden menu
item is not a guard — `/family` re-checks with `isAdmin()` in its own body and
redirects, and every action behind it re-checks for itself.

Email addresses are loaded only for the admin's approval dialog
(`getMemberAccounts`), never with the member cards everybody sees.

## Rejecting vs. removing

**Rejecting** deletes the `family_members` row of someone still `pending`. Their
Google account survives, so signing in again puts them back in the queue.
Rejecting is a "not today", not a ban. To bar someone for good, delete the user
under **Authentication** in the Supabase dashboard — that cascades the member
row away and stops them signing in at all.

`rejectMember` carries `.eq("status", "pending")` so it can never touch an
approved member; that is `removeMember`'s job, and only that one checks the
last-admin rule.

### Removing someone

Removing an approved member deletes their wishes (`ON DELETE CASCADE`) and
**releases anything they had claimed** on other people's lists back to unclaimed
(`ON DELETE SET NULL`, plus the `clear_claim_timestamp` trigger that clears the
paired timestamp so the delete does not trip `claim_consistent`).

This is the one remaining way a reserved wish disappears from under its buyer.

Their **history** is not removed. `fulfilled_wishes` copies both names rather
than joining to them, so the records survive with the ids nulled and the names
intact — otherwise removing one person would quietly rewrite everybody else's
record of gifts they really received. See [History](history.md).

## Rejoining the queue

After a rejection or removal the person's auth user still exists, so signing in
again creates nothing — the trigger only fires on insert. Without a repair they
would hold a valid session with no member row: `resolveAccess` reads that as
signed out, every page sends them to `/login`, and `/login` sends them back.

So `/auth/callback` re-inserts them as `pending` when it finds an auth user with
no member row. It never bootstraps an admin — that is the trigger's job on a
genuinely empty table; doing it here would hand the family to whoever removed
themselves last.

## Sessions

`src/proxy.ts` — **not** `middleware.ts`; Next.js 16 renamed the convention —
does two things per request:

1. Refreshes the access token and writes the rotated cookies onto the response.
   Server Components cannot set cookies, so without this every session would
   quietly expire mid-visit.
2. Bounces visitors with no session to `/login` before a render starts.

The second is a convenience, not the defence. Every page resolves access again,
and every Server Action re-derives its caller — Server Actions are reachable by
direct POST, not only through the UI. Deleting `proxy.ts` would cost speed, not
safety.

It also cannot do the whole job: whether someone is *approved* lives in
`family_members`, which only the `service_role` key can read, and that key has no
business in an edge proxy.

`/auth/*` is excluded from the matcher — the callback sets the session cookies
itself and holds a one-shot PKCE verifier while it does. The PWA metadata routes
are excluded too, since redirecting them to an HTML login page breaks installing
the app.

### Where the OAuth exchange happens

Entirely on the server. `signInWithGoogle` asks Supabase for the authorize URL
instead of navigating (`skipBrowserRedirect`), the PKCE verifier is stored in a
cookie, and `/auth/callback` trades the code for a session. No Supabase auth
client is ever created in the browser, so no session lands in `localStorage`
where a script could read it.

`getAuthUser` uses `getUser()`, which revalidates the token with Supabase rather
than trusting whatever the cookie decoded to.
