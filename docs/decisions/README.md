# Decisions

Why one thing rather than the obvious alternative. Read the file that covers
what you are touching; these are linked from the code they explain.

| Document | Covers |
|---|---|
| [The privacy rule](privacy-rule.md) | Why it cannot be an RLS policy, where it is enforced, the deliberate exception, when the secret ends, and the three accepted holes |
| [Wishes, claims and history](wishes-claims-history.md) | Conditional writes, the three list shapes, photos, and what happens at hand-over |
| [Groups and invites](groups-and-invites.md) | Per-group names and roles, the creation cap, invite links, removal, deletion, and a known gap |
| [Identity and sessions](identity-and-sessions.md) | Sign-in, the identity trigger and its repair, the proxy, and the OAuth exchange |
| [Live updates](live-updates.md) | The empty ping, per-group channels, keeping the socket alive, and the client cache |
| [UI patterns](ui-patterns.md) | Dialogs, busy state, refusals, photos, group tags, layout, typography and the PWA |

## Adding one

A new file belongs here when a choice was made **against a reasonable
alternative** and the reason would otherwise be lost. If the reason fits in two
lines, it is a code comment instead.

Do not add a file that describes how something works. That is what the code is
for, and it is what makes documentation need updating every sprint.
