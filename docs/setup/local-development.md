# Local development

```bash
npm install
npm run db:start     # first run: see One-time setup below
npm run dev          # in another terminal
```

Open [localhost:3000](http://localhost:3000) and sign in. The first person to
sign in becomes the admin.

`npm run dev` talks to a **local Supabase stack in Docker**, never to the hosted
project. Everything it needs is committed — there is nothing to copy.

## Why a local database at all

Pointing `npm run dev` at the hosted project means every schema change is tried
out in production, and `0003_auth.sql` opens with `truncate family_members
cascade`. That is not a migration you can rehearse on live data.

It is the Supabase CLI stack rather than a plain Postgres container because a
plain container cannot run this app: `0003_auth.sql` adds a foreign key to
`auth.users` and a trigger on it, sign-in is Google OAuth, and live updates need
Realtime. All three belong to services the CLI starts alongside Postgres.
Storage, Edge Functions, analytics and the mail catcher are switched off in
[`supabase/config.toml`](../../supabase/config.toml), which leaves seven
containers.

## One-time setup

### 1. Tell Google about the local callback

In the Google Cloud Console, open the **same OAuth client production uses**
([production setup](production.md#2-set-up-google-sign-in)) and add

```
http://127.0.0.1:54421/auth/v1/callback
```

to its **Authorized redirect URIs**, keeping the production one.

That address is the local GoTrue container, not the app — Google returns to
GoTrue, and GoTrue returns to `/auth/callback` on port 3000. Adding it takes
nothing away from production: an OAuth client may list many redirect URIs, and
which one is used is decided by whichever Supabase started the flow.

### 2. Give the CLI those credentials

```bash
cp supabase/.env.example supabase/.env
```

Fill in the client ID and secret. The CLI reads dotenv files from `supabase/`
first, then the repo root, and resolves every `env(...)` in `config.toml` from
them. This file is gitignored.

### 3. Start it

```bash
npm run db:start     # first run fetches the CLI and pulls images; several minutes
```

There is no fourth step. The address and keys are already in the committed
[`.env.development`](../../.env.development): the stack's `anon` and
`service_role` keys are the `supabase-demo` JWTs the CLI ships with, signed with
its built-in default secret — the same strings on every machine, addressing
nothing but `127.0.0.1`. There was never anything machine-specific to paste.

## Environment files

Next resolves `.env.development.local` → `.env.local` → `.env.development` →
`.env`.

| File | Holds | Read by |
|---|---|---|
| `.env.development` | the local Docker stack — **committed** | `npm run dev` |
| `.env.production.local` | the hosted project — gitignored | `npm run build && npm start` |
| `.env.development.local` | free slot, for overrides | `npm run dev`, outranks the above |

**Leave `.env.local` unused.** It would outrank `.env.development` and quietly
point `npm run dev` at production. Keeping production values in
`.env.production.local` leaves that slot empty, so neither file is ever swapped
out.

Would rather develop against the hosted project than install Docker? Copy
`.env.example` to `.env.development.local` and fill it in — it outranks
`.env.development`, so no Docker is needed.

## Day to day

```bash
npm run db:start     # bring the stack up
npm run dev          # in another terminal
npm run db:stop      # when you are done; data survives
npm run db:status    # print the local URLs and keys
```

Studio is at [127.0.0.1:54423](http://127.0.0.1:54423) and Postgres itself is on
54422. The ports are shifted out of the usual `5432x` range so this project can
run beside another local Supabase project without either having to be stopped.

**Check which port `next dev` picked.** If 3000 is busy it takes 3001 without
making a fuss, and an origin that is not in `additional_redirect_urls` does not
fail loudly — GoTrue sends you to `site_url` instead, so sign-in looks like it
worked and leaves you on the wrong port. 3000 and 3001 are both allow-listed in
`supabase/config.toml`; anything beyond that needs adding, followed by
`npm run db:stop && npm run db:start`.

## Resetting and seeding

```bash
npm run db:reset     # drop everything, re-apply the migrations, then supabase/seed.sql
npm run db:seed      # fake family — after signing in
```

`db:reset` wipes `auth.users` too, so the loop is:

1. `npm run db:reset`
2. sign in at [localhost:3000](http://localhost:3000) — you become the admin
3. `npm run db:seed`

**The middle step cannot be skipped**, and that is deliberate.
`handle_new_auth_user()` picks the admin with `not exists (select 1 from
family_members)`, so any seeded member would make that false and leave your real
sign-in stuck as `pending`, waiting on an admin who does not exist. Hence
[`supabase/seed.sql`](../../supabase/seed.sql) is empty of members, and
[`scripts/seed-dev.mjs`](../../scripts/seed-dev.mjs) builds the fake family
around the row your sign-in created: three relatives, ten wishes, and claims
running in both directions.

Re-running the seed is safe. Every seeded member carries an `@seed.local` email
and is deleted first; their wishes go with them.

Two of your own four wishes end up reserved — the one state the UI cannot put you
in. Your list says nothing about either, and trying to delete or edit them is
what [the refusal](../content/privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen)
looks like.

The seed script refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` resolves to
loopback. It writes fabricated data with a key that bypasses RLS, so it has to be
*incapable* of reaching the hosted project, not merely unlikely to.

## Troubleshooting

| Symptom | Means |
|---|---|
| `connection refused` on `127.0.0.1:54421` | the stack is not running — `npm run db:start` |
| The "connect your database" card | the environment values themselves are missing, which now only happens to a production build |
| Sign-in lands on the wrong port | `next dev` took 3001 and it is not allow-listed — see above |
| Updates feel a minute late | the live ping is failing; check the server log for `Live update ping failed` ([why](../content/live-updates.md#keeping-the-socket-alive)) |

## Checks

```bash
npm run typecheck && npm run lint && npm test
```

Tests are Vitest over **pure functions only** — no mocks, no database.
