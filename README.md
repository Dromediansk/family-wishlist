# Family Wish List

A small web app for a family — or a team, or any circle of people: everyone keeps
a list of things they'd like, and everyone else can quietly claim an item to buy
so two people don't turn up with the same gift.

The rule the whole app is built around:

> **Your own list never tells you that something on it has been claimed.**
> Everyone else sees it. You don't.

With one deliberate exception, and only if you go looking: a wish somebody has
reserved can no longer be deleted or edited by its owner, and the refusal says
so. It never says who reserved it.

## How it works

- **Sign in with Google.** No passwords to invent or forget.
- **Groups are the door.** You create one and become its admin, or you open an
  invite link somebody sent you and you are in. There is nothing to approve and
  no queue to wait in — the link *is* the permission.
- **One account, several groups.** Your parents and your colleagues can be two
  different circles, each with its own display name for you, and neither one sees
  the other.
- **Roles are per group.** Members add wishes and claim from other lists. An
  admin of a group can also rename, promote, demote and remove its members — and
  is nobody in particular in anybody else's group.
- **Wishes** have a title, and optionally a description, a link and a photo.
- **Claim quietly.** Reserve something on someone else's list; everyone except
  its owner can see that you did.
- **Mark it given.** Once the gift is handed over, the buyer ends the secret and
  both sides keep a permanent record of it.
- **Everything is live.** Changes appear in every other open tab within about a
  second — without the app ever saying what changed.
- **Installable.** Add it to a phone's home screen and it opens like any other
  app.

## Try it locally

```bash
npm install
npm run db:start     # local Supabase stack in Docker
npm run dev          # in another terminal
```

Then open [localhost:3000](http://localhost:3000), sign in, and create a group —
you are its admin. The first run needs a Google OAuth client;
[Local development](docs/setup/local-development.md) has the four-step version.

## Documentation

Everything lives in [`docs/`](docs/README.md), in three layers:

- [**Project context**](docs/project-context.md) — purpose, domain, goals,
  entities and the business rules the app must obey.
- [**Technical context**](docs/technical-context.md) — technologies,
  architectural patterns, coding standards, development practices and the
  dependency choices behind them.
- [**Decisions**](docs/decisions/README.md) — why one thing rather than the
  obvious alternative: [the privacy rule](docs/decisions/privacy-rule.md),
  [wishes and history](docs/decisions/wishes-claims-history.md),
  [groups and invites](docs/decisions/groups-and-invites.md),
  [identity](docs/decisions/identity-and-sessions.md),
  [live updates](docs/decisions/live-updates.md),
  [UI patterns](docs/decisions/ui-patterns.md).

Running it: [Local development](docs/setup/local-development.md) ·
[Production](docs/setup/production.md) · [Database](docs/setup/database.md) ·
[Deployment](docs/setup/deployment.md).

Working on the code? [`CLAUDE.md`](CLAUDE.md) is the short version.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI
primitives · Supabase Postgres · Supabase Auth (Google)

Every read and write happens on the server with the `service_role` key. Row level
security is on for every table with no policies at all, because the one rule
above cannot be expressed as one — [the reasoning is
here](docs/decisions/privacy-rule.md#why-it-cannot-be-a-database-policy).
