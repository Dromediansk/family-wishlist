# Family Wish List

A small web app for a family: everyone keeps a list of things they'd like, and
everyone else can quietly claim an item to buy so two people don't turn up with
the same gift.

The rule the whole app is built around:

> **You never find out that something on your own list has been claimed.**
> Everyone else sees it. You don't.

## How it works

- **No login.** On your first visit you pick which family member you are. That
  choice is remembered in a cookie. There are no passwords — this is a family,
  and identity is trust-based by design.
- **Roles.** Members add wishes and claim from other lists. Admins can also add,
  rename, promote and remove family members.
- **Wishes** have a title, and optionally a description and a link.

## Setup

You need a free Supabase project. It's used as the database only — not for auth.

### 1. Create the database

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the **SQL editor**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.

   There is no second migration to run.
   [`0002_realtime.sql`](supabase/migrations/0002_realtime.sql) is a note, not
   DDL — live updates need no database changes, and it explains which tempting
   change would break the app.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key — not the anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** key. Optional — only needed for live updates |

> The service_role key bypasses row level security. It must never be prefixed
> with `NEXT_PUBLIC_` and must never reach the browser. `.env.local` is
> gitignored; on a host, set it as a secret.
>
> The anon key is the opposite: it is *meant* to reach the browser. It opens no
> table — see [below](#live-updates).

### 3. Run it

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The first person to open the app
sets up the family — whoever fills in that first name becomes the admin and can
add everyone else from **Manage family**.

## Why the service_role key, and not the anon key

Normally a Supabase app talks to the database straight from the browser using
the anon key, with row level security deciding who sees what.

That can't work here. This app has no login, so Postgres has no per-user
identity to write a policy against — there is no way to express "hide the
claim from the person whose list it is" as an RLS policy. If the browser held a
key that could read the `wishes` table, anyone could open devtools and see
exactly who was buying what for them. The surprise would only be a UI illusion.

So instead:

- Row level security is **on** for every table, with **no policies at all**.
  The anon key can read and write nothing.
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
with that visitor's cookie. The redaction is applied where it always was, in
`getWishListFor`, and no wish data ever travels over the socket.

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

If `NEXT_PUBLIC_SUPABASE_ANON_KEY` is unset, this all switches off cleanly and
the app behaves as it did before, minus the live part.

## Things worth knowing

- **Identity is spoofable.** The cookie says who you are and nothing verifies
  it. Anyone with the link can claim to be anyone. That's the accepted trade
  for having no passwords; don't use this for anything that isn't a family.
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

Live updates work on serverless hosts: the browser holds its socket open to
Supabase rather than to the Next.js server, and the server publishes with a
single HTTP request. Nothing needs a long-running process.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Radix UI primitives ·
Supabase Postgres
