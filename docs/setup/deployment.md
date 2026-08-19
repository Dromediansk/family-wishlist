# Deployment

Any host that runs Next.js works. Nothing here needs a long-running process.

## Before you deploy

Have a Supabase project and a Google OAuth client set up —
[Production setup](production.md).

## On the host

Set the three environment variables from
[Production setup → Configure the app](production.md#3-configure-the-app) as
secrets. On Vercel, import the repo and add them there; the build needs no
further configuration.

`SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_`.

## After the first deploy

Once you know the production URL, add it in **two** places or sign-in will work
locally and fail in production:

1. the Google OAuth client's **Authorized JavaScript origins**;
2. Supabase's **Authentication → URL Configuration**, as the Site URL and under
   Redirect URLs.

Behind a proxy that rewrites `Host`, set `NEXT_PUBLIC_SITE_URL` as well. Without
it the callback URL is derived from the incoming request, which is correct
everywhere else — localhost, preview deployments and production each get their
own value with nothing to configure.

## What the runtime expects

- **Every route renders per request.** The root layout is `force-dynamic`, and
  nothing may be cached between visitors — two people looking at the same list
  must see different things.
- **No service worker**, deliberately.
  [Why](../content/ui-patterns.md#the-installable-app).
- **Live updates need no special hosting.** The browser holds its socket open to
  Supabase, not to the Next.js server, and the server publishes with a single
  HTTP request — so this works on serverless. It does need Realtime server
  ≥ v2.97.0, and a paused free Supabase project takes Realtime down with it. See
  [Live updates](../content/live-updates.md#keeping-the-socket-alive).
- **Migrations do not run on deploy.** They are applied by hand —
  [Database](database.md#applying-them).
