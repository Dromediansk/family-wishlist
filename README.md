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
- **Wishes** have a title, and optionally a description and a link.
- **Claim quietly.** Reserve something on someone else's list; everyone except
  its owner can see that you did.
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

Everything lives in [`docs/`](docs/README.md).

**How it behaves, and why**

- [The privacy rule](docs/content/privacy-rule.md) — the rule, why it cannot be
  a database policy, and the four accepted holes in it
- [Wishes](docs/content/wishes.md) · [Claiming](docs/content/claiming.md) ·
  [Groups](docs/content/groups.md) · [Identity](docs/content/membership.md)
- [Live updates](docs/content/live-updates.md) — how every tab stays current
  without being told what changed
- [UI patterns](docs/content/ui-patterns.md) — dialogs, language, typography,
  the installable app

**How to run it**

- [Local development](docs/setup/local-development.md)
- [Production setup](docs/setup/production.md) ·
  [Database](docs/setup/database.md) · [Deployment](docs/setup/deployment.md)

Working on the code? [`CLAUDE.md`](CLAUDE.md) has the commands, rules and
patterns.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI
primitives · Supabase Postgres · Supabase Auth (Google)

Every read and write happens on the server with the `service_role` key. Row level
security is on for every table with no policies at all, because the one rule
above cannot be expressed as one — [the reasoning is
here](docs/content/privacy-rule.md#why-it-cannot-be-a-database-policy).
