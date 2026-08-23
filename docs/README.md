# Documentation

Three layers, read in this order.

| | |
|---|---|
| [**Project context**](project-context.md) | Purpose, domain, goals, entities and business rules. What the app is for. |
| [**Technical context**](technical-context.md) | Technologies, architectural patterns, coding standards, development practices and dependency choices. How it is built. |
| [**Decisions**](decisions/) | Why one thing rather than the obvious alternative. Read the one that covers what you are touching. |
| [**Setup**](setup/) | Runbooks: local development, production, database, deployment. |

## What goes where

The two context documents hold **rules and reasons**. `decisions/` holds
**rationale for a choice already made**. Neither describes code.

A statement that would go stale when a function is renamed does not belong in
any of them — it belongs in a comment next to that function. This is why adding
a feature usually needs **no documentation change at all**: write the code, and
touch a doc only when a rule or a decision actually changed.

Two things are deliberately not written down here:

- **Where the privacy rule is enforced.** Every site carries a `PRIVACY-RULE:`
  tag in its doc comment; `rg 'PRIVACY-RULE:'` is the list. A hand-maintained
  copy would drift, and did.
- **The schema, column by column.** `supabase/migrations/` is the schema.
  [Database](setup/database.md) covers only what the DDL cannot say for itself.

## Elsewhere

- [`../README.md`](../README.md) — what the app is, for someone who has just
  found it.
- [`../CLAUDE.md`](../CLAUDE.md) — the short version, for working on the code.
