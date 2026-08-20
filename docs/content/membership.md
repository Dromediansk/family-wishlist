# Identity

One job: **who is this person.** What they may see follows from which groups they
are in, which is [Groups](groups.md).

## Signing in makes you somebody, not a member

Google will hand a session to any account in the world, and Supabase does not
restrict which accounts may complete the OAuth flow. So a session proves an
identity and nothing more.

That is a legal place to stand. An account that belongs to no group is
`groupless`: it has a list of its own, a name and a session, and `/start` is what
it sees until it creates a group or opens an invite.

## The three states

| State | Means | Sees |
|---|---|---|
| `anonymous` | no session, or a session with no `app_users` row | `/login` |
| `groupless` | signed in, in no group | `/start` |
| `member` | in at least one group | the app |

`resolveAccess` ([`src/lib/access.ts`](../../src/lib/access.ts)) is the single
place these are decided, and every page routes off it. It is a pure function
over already-fetched values, so it is unit-tested for real rather than through
mocks.

A signed-in visitor with **no** `app_users` row is treated as anonymous. That
only happens if the row was deleted out from under a live session — see
[The repair](#the-repair).

## One row per Google account

`app_users` is the identity table: one row per account, holding the email, the
seed name Google supplied, and `auth_user_id`. Which groups that account is in
lives in `memberships`, and so does its per-group name — the account's own `name`
is only a starting point for those, plus the snapshot `fulfil_wish` writes into
history.

The row is created by a database trigger (`handle_new_auth_user`, defined in
`0008_multi_tenant.sql`) rather than in application code, and it decides
nothing: one insert, no role, no group.

A trigger because it leaves **no gap.** It fires on `INSERT` into `auth.users`,
so an auth user cannot exist without an identity. Creating the row in the
callback route instead would leave a window in which a signed-in visitor has a
session and no row, and every page would have to cope with that state.

The name comes from the Google profile — `full_name`, falling back to `name`,
then the local part of the email, then `Bez mena`. Names are **not unique**;
identity is `auth_user_id`.

### The repair

`ensureAppUser` ([`src/lib/data/access.ts`](../../src/lib/data/access.ts)) runs in
`/auth/callback` and covers the one case the trigger cannot: an `auth.users` row
that already exists, whose `app_users` row is missing. The trigger only fires on
insert, so signing in again would create nothing, and without the repair that
account holds a valid session with no identity — `resolveAccess` reads it as
signed out, every page sends it to `/login`, and `/login` sends it back.

It is the one function in the data layer that takes no `Viewer`, because the row
it writes is what a `Viewer` is built from. It is scoped all the same:
`authUserId` comes from the verified session, never from anything a caller
supplies.

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

It also cannot do the whole job: which groups somebody is in lives in
`memberships`, which only the `service_role` key can read, and that key has no
business in an edge proxy.

`/login` and `/join/*` are exempt from the bounce. The join route has to be:
it is what sends a signed-out visitor on to `/login`, and it never gets the
chance if the redirect fires first. `/auth/*` is excluded from the matcher
instead — the callback sets the session cookies itself and holds a one-shot PKCE
verifier while it does. The PWA metadata routes are excluded too, since
redirecting them to an HTML login page breaks installing the app.

### Where the OAuth exchange happens

Entirely on the server. `signInWithGoogle` asks Supabase for the authorize URL
instead of navigating (`skipBrowserRedirect`), the PKCE verifier is stored in a
cookie, and `/auth/callback` trades the code for a session. No Supabase auth
client is ever created in the browser, so no session lands in `localStorage`
where a script could read it.

`getAuthUser` uses `getUser()`, which revalidates the token with Supabase rather
than trusting whatever the cookie decoded to. It is the only thing
[`src/lib/supabase-auth.ts`](../../src/lib/supabase-auth.ts) is for: that client
answers *who is this* and reads no table, while
[`src/lib/supabase.ts`](../../src/lib/supabase.ts) holds the `service_role` key
and does every piece of data work. Never mix them — calling `.from()` on the
session client returns empty, which reads as "no rows" rather than "no access".
