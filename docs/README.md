# Documentation

Two halves. Product docs explain **what the app does and why**; setup docs
explain **how to run it**.

Nothing is repeated between files — where two topics touch, one links to the
other.

## Product — `content/`

| Document | Covers |
|---|---|
| [The privacy rule](content/privacy-rule.md) | The rule the whole app is built around, why it cannot be an RLS policy, where it is enforced, and the one accepted hole in it |
| [Wishes](content/wishes.md) | What a wish is, who may change one, and what happens when an owner is refused |
| [Claiming](content/claiming.md) | Reserving and releasing items on other people's lists |
| [History](content/history.md) | Marking a gift handed over, and the two pages that remember it |
| [Membership and roles](content/membership.md) | Sign-in, the approval queue, admins, and sessions |
| [Live updates](content/live-updates.md) | How every tab stays current without being told what changed |
| [UI patterns](content/ui-patterns.md) | Dialogs, refusals, language, typography and the installable app |

## Setup — `setup/`

| Document | Covers |
|---|---|
| [Local development](setup/local-development.md) | The Docker database, environment files, and the day-to-day loop |
| [Production](setup/production.md) | Creating the Supabase project and the Google OAuth client |
| [Database](setup/database.md) | Schema, migrations, and the CLI commands that must never be run |
| [Deployment](setup/deployment.md) | Hosting the Next.js app |

## Elsewhere

- [`../README.md`](../README.md) — what the app is, for someone who has just found it.
- [`../CLAUDE.md`](../CLAUDE.md) — commands, rules and patterns for working on the code.
