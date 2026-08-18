# Family Wish List

A small web app for a family: everyone keeps a list of things they'd like, and
everyone else can quietly claim an item to buy so two people don't turn up with
the same gift.

The rule the whole app is built around:

> **Your own list never tells you that something on it has been claimed.**
> Everyone else sees it. You don't.

With one deliberate exception, and only if you go looking: a wish somebody has
reserved can no longer be deleted or edited by its owner, and the refusal says
so. It never says who reserved it.

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

4. Run
   [`supabase/migrations/0004_claim_notices.sql`](supabase/migrations/0004_claim_notices.sql).
   It adds the buyer-notice table and its triggers. It deletes nothing and
   alters no existing table.

5. Finally run
   [`supabase/migrations/0005_drop_claim_notices.sql`](supabase/migrations/0005_drop_claim_notices.sql),
   which drops that table and both triggers again. A reserved wish can no longer
   be deleted or rewritten by its owner, so there is nothing left for them to
   report. It is a forward migration rather than an edit to `0004` because
   production already had `0004` pasted in; on a fresh database you still need
   both, in order. It touches no wish and no member.

This is the production path, and it stays manual on purpose — see
[Never run these](#never-run-these). For development there is a local database
in Docker instead; see [A local database](#a-local-database).

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
cp .env.example .env.production.local
```

Fill in from **Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key — not the anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** key. Required — it carries the session |

> The service_role key bypasses row level security. It must never be prefixed
> with `NEXT_PUBLIC_` and must never reach the browser. `.env.production.local`
> is gitignored; on a host, set it as a secret.
>
> The anon key is the opposite: it is *meant* to reach the browser. It opens no
> table — see [below](#live-updates).

These are the values your host needs, and the ones a local `npm run build && npm
start` reads. **Development does not use them**: `npm run dev` reads the
committed `.env.development` and talks to the database in Docker instead, which
is the next section.

### 4. Run it

```bash
npm install
npm run db:start     # the local database; see A local database for its one-time setup
npm run dev
```

Open [localhost:3000](http://localhost:3000) and sign in. The first person to
sign in becomes the admin, and everyone who follows waits in **Manage family**
until that admin lets them in.

> Would rather develop against the hosted project than install Docker? Copy
> `.env.example` to `.env.development.local` as well — it outranks
> `.env.development`, so `npm run dev` uses it and no Docker is needed.

## A local database

Pointing `npm run dev` at the hosted project means every schema change is tried
out in production, and `0003_auth.sql` opens with `truncate family_members
cascade` — the kind of migration you cannot rehearse on live data. So
development gets its own database in Docker.

It is the Supabase CLI stack rather than a plain Postgres container, because a
plain Postgres container cannot run this app: `0003_auth.sql` adds a foreign key
to `auth.users` and a trigger on it, sign-in is Google OAuth, and live updates
need Realtime. All three belong to services the CLI starts alongside Postgres.
Storage, Edge Functions, analytics and the mail catcher are switched off in
[`supabase/config.toml`](supabase/config.toml) — nothing here uses them — which
leaves seven containers.

The CLI is fetched by `npx` at a pinned version rather than installed as a
devDependency, which is what the `db:*` scripts in `package.json` are doing. The
`supabase` npm package is a shim around a platform binary of about 110 MB, and
`npm install` on a Linux build host takes *two* of them — the published packages
declare `os` and `cpu` but no `libc`, so the glibc and musl builds both match.
Vercel installs devDependencies, because `next build` needs them, so leaving it
in `package.json` meant roughly 300 MB unpacked on every deploy for a tool the
build never runs. The first `db:*` command of the day pays a few seconds to
populate the npx cache instead.

### One-time setup

**1. Tell Google about the local callback.** In the Google Cloud Console, open
the same OAuth client production uses and add

```
http://127.0.0.1:54421/auth/v1/callback
```

to its **Authorized redirect URIs**, keeping the production one. That address is
the local GoTrue container, not the app — Google returns to GoTrue, and GoTrue
returns to `/auth/callback` on port 3000. Adding it takes nothing away from
production: an OAuth client may list many redirect URIs, and which one is used
is decided by whichever Supabase started the flow.

**2. Give the CLI those credentials.**

```bash
cp supabase/.env.example supabase/.env
```

Fill in the client ID and secret. The CLI reads dotenv files from `supabase/`
first, then the repo root, and resolves every `env(...)` in `config.toml` from
them. This file is gitignored.

**3. Start it.**

```bash
npm run db:start     # first run fetches the CLI and pulls images; several minutes
```

There is no third step, and nothing to copy: the address and keys are already in
[`.env.development`](.env.development), committed. The stack's `anon` and
`service_role` keys are the `supabase-demo` JWTs the CLI ships with, signed with
its built-in default secret — the same strings on every machine, addressing
nothing but `127.0.0.1`. There was never anything machine-specific to paste, so
the file is checked in rather than templated.

Two filenames are doing the work. Next resolves `.env.development.local` →
`.env.local` → `.env.development` → `.env`, so a file called `.env.local`
would outrank `.env.development` in development and quietly point `npm run dev`
at the hosted project. Keeping the production values in
`.env.production.local` leaves that slot empty: `npm run dev` gets Docker,
`npm run build && npm start` gets the hosted project, and neither file is ever
swapped out. `.env.development.local` stays free as an override, which is what
the note at the end of [Run it](#4-run-it) uses.

> The symptom of a stack that is not running is a connection refused to
> `127.0.0.1:54421`, not the "connect your database" card — the values are
> present, there is just nothing answering on that port. The card means the
> values themselves are missing, which now only happens to a production build.

### Day to day

```bash
npm run db:start     # bring the stack up
npm run dev          # in another terminal
npm run db:stop      # when you are done; data survives
```

Studio is at [127.0.0.1:54423](http://127.0.0.1:54423) and Postgres itself is on
54422. The ports are shifted out of the usual `5432x` range so this project can
run beside another local Supabase project without either having to be stopped.

> **Check which port `next dev` picked.** If 3000 is busy it takes 3001 without
> making a fuss, and an origin that is not in `additional_redirect_urls` does not
> fail loudly — GoTrue sends you to `site_url` instead, so sign-in looks like it
> worked and leaves you on the wrong port. 3000 and 3001 are both allow-listed in
> `supabase/config.toml`; anything beyond that needs adding, followed by
> `npm run db:stop && npm run db:start`.

### Resetting and seeding

```bash
npm run db:reset     # drop everything, re-apply 0001–0005, then supabase/seed.sql
```

`db:reset` wipes `auth.users` too, so the loop after it is:

1. `npm run db:reset`
2. sign in at [localhost:3000](http://localhost:3000) — you become the admin
3. `npm run db:seed`

The middle step cannot be skipped, and that is deliberate.
`handle_new_auth_user()` picks the admin with `not exists (select 1 from
family_members)`, so any seeded member would make that false and leave your real
sign-in stuck as `pending`, waiting on an admin who does not exist.
[`supabase/seed.sql`](supabase/seed.sql) is therefore empty of members, and
[`scripts/seed-dev.mjs`](scripts/seed-dev.mjs) builds the fake family around the
row your sign-in created: three relatives, ten wishes, and claims running in
both directions. Re-running it is safe.

Two of your own four wishes end up reserved, which is the state the UI cannot
put you in: your list says nothing about either, and trying to delete or edit
them is what the refusal looks like.

Nothing about the migrations changed for this. `supabase db reset` applies
`0001` through `0005` in order; the CLI accepts the `0001_`-style names as they
are. It also applies `0002_realtime.sql`, which the setup section above says not
to run — harmless, because that file is entirely comments and contains no DDL.

### Never run these

Production has no `supabase_migrations.schema_migrations` table, because its
migrations were always pasted into the SQL editor by hand. The CLI would
therefore see a database with nothing applied and offer to apply everything —
including `0003_auth.sql` and its `truncate`.

So: **never run `supabase link`, `supabase db push`, `supabase db pull`, or
`supabase db reset --linked`** in this repo. The CLI is here for the local stack
and nothing else, and production stays hand-migrated.

Two things back that up rather than relying on memory: `supabase/.temp/` is
gitignored, so no link becomes sticky, and `scripts/seed-dev.mjs` refuses to run
unless `NEXT_PUBLIC_SUPABASE_URL` resolves to loopback.

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

The same reasoning shapes the counts on the family grid. Every card shows how
many wishes are still free next to the list's total — "2 / 5" — except your own,
which shows the total alone. "3 / 5" on your own card would say, in arithmetic,
that two of your wishes are already spoken for. So the query that counts free
wishes skips your rows in its `WHERE` clause, and `MemberSummary` splits the two
shapes so your own card has no such number to render at all;
`src/lib/members.test.ts` pins it down.

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
answers it by calling `syncFromLive`, a Server Action that throws away
everything that tab has cached and re-runs the page on the server as whoever is
signed in there. The redaction is applied where it always was, in
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
- `src/app/actions/live.ts` — `syncFromLive`, the one Server Action that reads
  nothing and writes nothing
- `src/components/live-refresh.tsx` — the browser side, mounted once in the root
  layout
- `supabase/migrations/0002_realtime.sql` — no DDL, just the reasoning above
  written down next to the schema, where the next person will look

The channel is public, so the anon key going to the browser gives anyone who
finds it two things: they can watch an empty message go past, and they can send
one, making open tabs re-render. Neither reveals anything — there is nothing in
the message. The migration note describes how to close the second one and why it
isn't worth it here.

### Why going back doesn't reload

Tapping a member and then tapping "Všetci" to return used to show a loading
skeleton both ways. That tap is a normal `<Link>` navigation, and Next only
keeps a page like that in memory for as long as
`experimental.staleTimes.dynamic` allows — 0 by default, so every page reached
by a link was re-fetched the moment you tapped back to it. Setting it to 60
seconds is what makes that instant.

The browser's own Back/Forward buttons were never subject to that default —
Next replays a page across those regardless of `staleTimes`, to avoid layout
shift and keep scroll position. Which means the family grid could already go
stale before any of this: sit on `/`, follow a member's list, have someone
claim one of that member's wishes, then press Back — the grid replayed with its
pre-claim counts, and `router.refresh()` was never going to correct it, because
it clears the current route alone and is not involved in a history navigation
at all. `syncFromLive` (`revalidatePath("/", "layout")`) purges every route in
the tab's cache on every ping, which fixes that too. So the 60 seconds bounds
the `<Link>` case alone; a Back/Forward replay is bounded by the ping, which
leaves exactly one scenario — a tab whose socket believes it is still
subscribed but has gone silent, where a Back navigation can replay a page that
is arbitrarily old.

Nothing new is stored by doing this. The cache holds the same per-viewer pages
the server had already decided to send, in memory, per tab, gone on reload —
and an owner's own page has no claim data in it to cache in the first place.

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
  claimed on other people's lists back to unclaimed. This is the one way a
  reserved wish still disappears from under its buyer.
- **You cannot delete or rewrite a wish someone has already reserved.** The bin
  and the pencil behave exactly as they always did — the same dialog, the same
  form — but confirming is refused: "Toto želanie už má niekto rezervované."
  Never who. The dialog then turns into that answer, with one **Zavrieť**
  button, rather than leaving you a Vymazať that fails every time you press it.
  Wait until they release it, or ask the family.

  This is the one place your own list admits a claim, and it is a real hole in
  the surprise: clicking the bin on each of your wishes would tell you which are
  taken. It replaced the older behaviour, where the delete quietly succeeded and
  the buyer found out afterwards on *Čo kupujem* — better to keep the gift than
  to keep the secret from someone determined to break it.
- **Two people claiming at once**: the claim is a conditional update, so the
  second one is told the item is already taken rather than silently overwriting.
  The refusal above works the same way — `claimed_by is null` is part of the
  `WHERE` clause, not a check performed before it.
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
| `npm run db:start` | Start the local Supabase stack in Docker |
| `npm run db:stop` | Stop it; the data survives |
| `npm run db:status` | Print the local URLs and keys |
| `npm run db:reset` | Drop and rebuild the local database from the migrations |
| `npm run db:seed` | Fill the local database with a fake family (after signing in) |

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
