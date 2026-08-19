# Production setup

You need a free Supabase project and a Google OAuth client. Doing this once is
what makes the app usable by a real family; hosting it is
[Deployment](deployment.md), and running it on your own machine is
[Local development](local-development.md).

## 1. Create the database

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Under **Storage**, create a bucket named `wish-photos`. Leave it **private**,
   set the file size limit to **2 MB**, and restrict the allowed MIME types to
   `image/webp`, `image/jpeg` and `image/png`. Do this before the migrations —
   `0006` adds the column that points into it.
3. Open the **SQL editor** and run the migrations by hand, in order. Which files,
   what each one does, and why this stays manual: [Database](database.md).

Add no Storage policy, exactly as you add no table policy. The app reads and
writes the bucket with the `service_role` key.

## 2. Set up Google sign-in

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
   `https://<your-domain>/**` under **Redirect URLs**.

Supabase refuses to send the browser anywhere not listed in step 3, and the
symptom is a redirect that lands on the wrong site rather than an error.

The same OAuth client is reused for local development — see
[Local development → One-time setup](local-development.md#one-time-setup).

## 3. Configure the app

```bash
cp .env.example .env.production.local
```

Fill in from **Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key — not the anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** key. Required — it carries the session |
| `NEXT_PUBLIC_SITE_URL` | Optional. Only needed behind a proxy that rewrites `Host` |

The **service_role** key bypasses row level security. It must never be prefixed
with `NEXT_PUBLIC_` and must never reach the browser. `.env.production.local` is
gitignored; on a host, set it as a secret.

The **anon** key is the opposite: it is *meant* to reach the browser. It opens no
table, because every table has RLS on with zero policies — see
[The privacy rule](../content/privacy-rule.md#why-it-cannot-be-a-database-policy).
Its two jobs are carrying the session and joining the live-update channel.

The file name matters. These values are read by a local `npm run build && npm
start` and by your host; **development does not use them**. Why the name is
`.env.production.local` and not `.env.local`:
[Local development → Environment files](local-development.md#environment-files).

## 4. Let people in

The first person ever to sign in becomes the admin. Everyone who follows waits
until that admin approves them in **Spravovať rodinu** — check the email address
first. See [Membership and roles](../content/membership.md).
