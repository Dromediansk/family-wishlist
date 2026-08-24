# Identity and sessions

One job: **who is this person.** What they may see follows from which groups
they are in — [Groups and invites](groups-and-invites.md).

## Signing in makes you somebody, not a member

Google will hand a session to any account in the world, and Supabase does not
restrict which accounts may complete the OAuth flow. A session proves an
identity and nothing more.

That is a legal place to stand. An account belonging to no group is
`groupless`: it has a list, a name and a session, and `/start` is what it sees.

| State | Means | Sees |
|---|---|---|
| `anonymous` | no session, or a session with no `app_users` row | `/login` |
| `groupless` | signed in, in no group | `/start` |
| `member` | in at least one group | the app |

`resolveAccess` is the single place these are decided, and every page routes off
it. It is a pure function over already-fetched values, so it is unit-tested for
real rather than through mocks.

## One row per Google account

The `app_users` row is created by a **database trigger** on `auth.users` rather
than in application code, and it decides nothing: one insert, no role, no group.

A trigger because it leaves **no gap.** Creating the row in the callback route
instead would leave a window in which a signed-in visitor has a session and no
row, and every page would have to cope with that state.

The name comes from the Google profile — `full_name`, falling back to `name`,
then the local part of the email, then `Bez mena`.

### The repair

`ensureAppUser` runs in `/auth/callback` and covers the one case the trigger
cannot: an `auth.users` row that already exists whose `app_users` row is
missing. The trigger only fires on insert, so signing in again would create
nothing, and without the repair that account holds a valid session with no
identity — read as signed out, sent to `/login`, and sent back again.

It is the one data-layer function that takes no `Viewer`, because the row it
writes is what a `Viewer` is built from. It is scoped all the same: `authUserId`
comes from the verified session, never from anything a caller supplies.

## Sessions

`src/proxy.ts` — **not** `middleware.ts`; Next.js 16 renamed the convention —
does two things per request:

1. **Refreshes the access token** and writes the rotated cookies onto the
   response. Server Components cannot set cookies, so without this every session
   would quietly expire mid-visit.
2. **Bounces visitors with no session** to `/login` before a render starts.

The second is a convenience, not the defence. Every page resolves access again
and every Server Action re-derives its caller. **Deleting `proxy.ts` would cost
speed, not safety.**

It also cannot do the whole job: which groups somebody is in lives in
`memberships`, which only `service_role` can read, and that key has no business
in an edge proxy.

`/login`, `/join/*`, `/privacy` and `/terms` are exempt from the bounce. The
join route has to be — it is what sends a signed-out visitor on to `/login`, and
it never gets the chance if the redirect fires first. The two legal pages have
to be because they are read *before* anybody signs in, Google's OAuth review
among them. Both stay inside the matcher, so a session that happens to be there
is still refreshed. `/auth/*` is excluded from the matcher instead: the callback
sets the session cookies itself and holds a one-shot PKCE verifier while it
does. The PWA metadata routes are excluded too, since redirecting them to an
HTML login page breaks installing the app.

### Where the OAuth exchange happens

Entirely on the server. `signInWithGoogle` asks Supabase for the authorize URL
instead of navigating (`skipBrowserRedirect`), the PKCE verifier is stored in a
cookie, and `/auth/callback` trades the code for a session. **No Supabase auth
client is ever created in the browser**, so no session lands in `localStorage`
where a script could read it.

`getAuthUser` uses `getUser()`, which revalidates the token with Supabase rather
than trusting whatever the cookie decoded to.
