# Family Wish List

A small web app for a family: everyone keeps a list of things they'd like, and
everyone else can quietly claim an item to buy so two people don't turn up with
the same gift.

The rule the whole app is built around:

> **You never find out that something on your own list has been claimed.**
> Everyone else sees it. You don't.

## How it works

- **Sign in with Google.** No passwords to invent or forget, and — unlike the
  name-picker this replaced — the app actually knows who you are.
- **An admin lets you in.** Anyone with a Google account can *complete* the
  sign-in flow; Supabase does not restrict that. So a first-time arrival sees a
  waiting screen and nothing else until an admin approves them. That approval is
  the door. The first person ever to sign in becomes that admin.
- **Roles.** Members add wishes and claim from other lists. Admins can also
  approve arrivals, rename, promote and remove family members.
- **Wishes** have a title, and optionally a description and a link.

## Setup

You need a free Supabase project, and a Google OAuth client.

### 1. Create the database

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the **SQL editor**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
3. Then run [`supabase/migrations/0003_auth.sql`](supabase/migrations/0003_auth.sql).

   > **This deletes every member and every wish.** Identity moved from "a name
   > you picked" to "a Google account", and there is no way to tell which
   > account an old row belonged to. On a fresh project there is nothing to
   > lose; on a running one, take a snapshot first.

   [`0002_realtime.sql`](supabase/migrations/0002_realtime.sql) is a note, not
   DDL — do not run it. Live updates need no database changes, and it explains
   which tempting change would break the app.

### 2. Set up Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com/auth/clients),
   create an **OAuth client ID** of type **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000`, plus your
     production URL.
   - **Authorized redirect URIs**: your Supabase callback,
     `https://<project-ref>.supabase.co/auth/v1/callback`. Copy the exact value
     from the Supabase Google provider page rather than typing it.
2. In Supabase, go to **Authentication → Providers → Google**, enable it, and
   paste the client ID and secret.
3. In **Authentication → URL Configuration**, set the **Site URL** to your
   production URL and add both `http://localhost:3000/**` and
   `https://<your-domain>/**` under **Redirect URLs**. Supabase refuses to send
   the browser anywhere not listed here, and the symptom is a redirect that
   lands on the wrong site rather than an error.

### 3. Configure the app

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key — not the anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** key. Required — it carries the session |

> The service_role key bypasses row level security. It must never be prefixed
> with `NEXT_PUBLIC_` and must never reach the browser. `.env.local` is
> gitignored; on a host, set it as a secret.
>
> The anon key is the opposite: it is *meant* to reach the browser. It opens no
> table — see [below](#live-updates).

### 4. Run it

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and sign in. The first person to
sign in becomes the admin, and everyone who follows waits in **Manage family**
until that admin lets them in.

## Why the service_role key, and not the anon key

Normally a Supabase app talks to the database straight from the browser using
the anon key, with row level security deciding who sees what.

That can't work here — and adding real logins didn't change it. There is no way
to express "hide the claim from the person whose list it is" as an RLS policy:
the row belongs to the owner, and a policy that lets them read their own row
lets them read `claimed_by` with it. If the browser held a key that could read
the `wishes` table, anyone could open devtools and see exactly who was buying
what for them. The surprise would only be a UI illusion.

Supabase Auth is therefore used for exactly one thing here: answering *who is
this person*. It never touches the data. `src/lib/supabase-auth.ts` holds the
visitor's session and can read nothing; `src/lib/supabase.ts` holds the
service_role key and does all the work. Sign-in raises the stakes on that
separation rather than relaxing it — browsers now carry a real authenticated
session, so a policy added to `wishes` in a weak moment would leak further than
it would have before.

So instead:

- Row level security is **on** for every table, with **no policies at all**.
  Neither the anon key nor a signed-in user's session can read or write
  anything.
- Every read and write happens on the server — in Server Components and Server
  Actions — using the service_role key.
- When you look at your **own** list, the server query doesn't even select the
  claim columns. They never leave the database, so they can't leak into the
  page.

`src/lib/types.ts` keeps the two shapes as separate types — `OwnerWish` has no
claim fields at all — so leaking one would be a type error rather than
something to remember. `src/lib/wishes.test.ts` pins that down.

## Live updates

Changes show up in everyone else's open tab within about a second, without a
refresh. The interesting part is what is *not* sent.

The obvious way to do this with Supabase is `postgres_changes`, which streams
row changes to the browser. That is unusable here for the same reason the anon
key is: it is filtered by row level security, so switching it on would mean
granting the browser read access to `wishes` — and every list owner would
receive their own `claimed_by` values. The surprise would survive only as long
as nobody opened devtools.

So the server broadcasts an **empty message**. It says "something changed" and
nothing else — not what changed, not whose list, not who did it. Every open tab
answers it by calling `router.refresh()`, which re-runs the page on the server
as whoever is signed in there. The redaction is applied where it always was, in
`getWishListFor`, and no wish data ever travels over the socket.

It also does one job it wasn't designed for: when an admin approves someone, the
ping reaches that person's waiting screen and it turns into the app by itself.

That is also why the owner's tab refreshes too, even though nothing on it can
change. A ping that skipped them would itself be the leak: an owner who noticed
they *didn't* get one would know why. Every tab refreshing on every change, with
nothing in the message, is what makes a claim indistinguishable from someone
adding a wish.

- `src/lib/live.ts` — the channel name and the deliberately empty payload,
  pinned by `src/lib/live.test.ts`
- `src/lib/realtime.ts` — the server side, called by every Server Action
- `src/components/live-refresh.tsx` — the browser side, mounted once in the root
  layout
- `supabase/migrations/0002_realtime.sql` — no DDL, just the reasoning above
  written down next to the schema, where the next person will look

The channel is public, so the anon key going to the browser gives anyone who
finds it two things: they can watch an empty message go past, and they can send
one, making open tabs re-render. Neither reveals anything — there is nothing in
the message. The migration note describes how to close the second one and why it
isn't worth it here.

## Sessions

`src/proxy.ts` refreshes the access token on every request and writes the
rotated cookies onto the response — Server Components can't set cookies, so
without it sessions would expire mid-visit. It also bounces signed-out visitors
to `/login` before a render starts.

That redirect is a convenience, not the defence. Every page resolves access
again through `resolveAccess` (`src/lib/access.ts`), and every Server Action
re-derives its caller with `getCurrentMember()` — which only ever returns an
*approved* member, so someone still waiting at the door is refused by all of
them without any of them knowing that "pending" is a state. Server Actions are
reachable by direct POST, not just through the UI, which is why the check lives
in each of them rather than at the entrance.

> The file is `proxy.ts`, not `middleware.ts`. Next.js 16 renamed the
> convention. Supabase's published guides still say middleware, and a file by
> that name here would simply never run.

## Things worth knowing

- **Anyone can sign in; only an admin can let them in.** Google will hand a
  session to any account in the world. The approval step in **Manage family** is
  what makes this a family app rather than a public one — check the email
  address before approving.
- **Rejecting someone** removes them from the family list, but their Google
  account still exists, so signing in again puts them back in the queue. To bar
  someone for good, delete the user under **Authentication** in the Supabase
  dashboard; that cascades to their member row and wishes.
- **Deleting a member** deletes their wishes, and releases anything they had
  claimed on other people's lists back to unclaimed.
- **If you delete a wish someone had claimed**, they aren't told — telling you
  they'd claimed it would give the game away. It just disappears from their
  *What I'm buying* page.
- **Two people claiming at once**: the claim is a conditional update, so the
  second one is told the item is already taken rather than silently overwriting.
- There must always be at least one admin, so the last one can't be demoted or
  removed.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |

## Deploying

Any host that runs Next.js works. On Vercel, import the repo and set
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. Every route is
rendered per request — nothing is cached between visitors, since two people
looking at the same list must see different things.

Once you know the production URL, add it to the Google OAuth client's authorized
origins and to Supabase's **Redirect URLs**, or sign-in will work locally and
fail in production.

Live updates work on serverless hosts: the browser holds its socket open to
Supabase rather than to the Next.js server, and the server publishes with a
single HTTP request. Nothing needs a long-running process.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Radix UI primitives ·
Supabase Postgres · Supabase Auth (Google)
