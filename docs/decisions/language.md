# Language

The app is read in Slovak and in English. Slovak is what it was written in and
what an unrecognised browser gets; English is the second language, and there is
no third planned.

## The locale is a cookie, not a URL segment

The obvious shape is `app/[locale]/`, and it is what the sibling project this
was modelled on does. It is the wrong shape here, for two reasons.

**`next/root-params` does not reach a Server Action or a Route Handler.** That
is where a third of the app's sentences live: every Zod message, every
`ActionResult.error`, the invite door's refusal and the OAuth callback's. With a
URL segment, an action would have to be *told* its language by each caller —
next-intl's own documentation recommends passing `locale` as an argument — and
one caller forgetting is a Slovak sentence in an English dialog, silently. A
cookie is readable from `cookies()`, which every server context has, so
`getRequestConfig` answers all of them the same way and `getErrorText()` needs
no argument.

**A prefix would touch the routing, and the routing is where the privacy rule
lives.** Moving the tree under `[locale]` means rewriting `isPublic()` and the
matcher regex in `src/proxy.ts`, every `redirect()`, `groupInPath()` and
`home-link.tsx`. That is a lot of risk to take on around access control in
exchange for per-locale URLs, and this app has no use for them: it is
invite-only, there is no directory, no search and nothing for a crawler to
index. An invite link would also start carrying its sender's language and
imposing it on whoever opened it.

The cost is that a locale is not linkable. Nobody has ever needed to send
somebody else a link to this app *in a particular language*.

`src/proxy.ts` therefore needs no change at all, and neither does any URL.

## Nobody is redirected, and a first visit sets no cookie

`src/i18n/request.ts` reads the cookie; with no cookie it negotiates
`Accept-Language` and falls back to Slovak. There is no middleware, no redirect
and no cookie written until somebody actually picks a language from the menu.

A visitor who never touches the switcher therefore carries no locale cookie at
all — which is one fewer thing for the privacy page to have to explain, and one
fewer round trip in front of the first paint. The root layout is already
`force-dynamic`, so reading a header per request costs nothing.

`pickLocale` is hand-rolled rather than `negotiator` +
`@formatjs/intl-localematcher`. Two locales do not pay for two dependencies, and
a pure function is testable under the repo's no-mocks rule — `q=0`, the
wildcard, and a malformed `q` all have cases.

## Not a column on `app_users`

A per-account locale would follow somebody between devices, which is the better
property. It loses on everything else: migrations reach production by hand, so
a column is a deployment step; RLS is on with no policies, so nothing would
guard it; it would be a database read on every request; and it would still need
a cookie underneath it, because `/login`, `/privacy` and `/terms` are read by
people who have no account yet — including Google's OAuth reviewer.

## `ActionResult.error` stays a sentence

The alternative was to make it a key plus params and translate on the client.
It would have been a bigger change for no gain: the action can already see the
locale, so `getErrorText()` words the refusal where it is raised, and none of
the five components that render `result.error` had to be touched. `final` keeps
meaning exactly what it meant.

What did change is that everything *feeding* those sentences hands over a key
rather than a sentence — `refusalFor`, `INVITE_EXPIRED_KEY`,
`requireGroupAdmin`'s `refusal` parameter, and every Zod `message`. A Zod schema
is built when its module loads, long before a request has a language, so a
sentence there could only ever have been one language's. Keys also keep
`refusalFor` pure, which is what lets its test still run with no database.

Length limits are read back off the Zod issue (`issue.maximum`) rather than
written into the message, so raising a `.max()` cannot leave the sentence
quoting the old number in either language.

**One thing stays untranslated on purpose**: about a dozen sites return
`error.message` straight from Supabase or Postgres, and `/auth/callback` passes
Google's `error_description` through. Those are English whatever the reader
chose. They say more than a generic sentence would, and they were never Slovak.

## Plurals are ICU, and `wishCount()` is gone

Slovak counts take three forms — 1 želanie, 2–4 želania, 0 and 5+ želaní — and
`wishCount()` used to be the only place that decided which. `Intl.PluralRules`
puts Slovak's `one`/`few`/`other` on exactly those boundaries, so the rule is
now a message and the function is deleted. English's two forms fall out of the
same mechanism.

The test moved with it: `createTranslator` renders a message with no React, no
request and no database, so the plural forms are still covered by a pure test —
and now in both languages.

## Sorting stays Slovak, dates do not

`Intl.Collator("sk")` in `src/lib/members.ts` is **not** locale-aware. The names
in a group are Slovak names whichever language the chrome is in, and a member
list that reordered itself when somebody switched language would be a worse
answer than a stable one. That is a fact about the data, not about the reader.

`formatDate` is the opposite — a date is the reader's own convention — so it
takes a locale and keeps one `Intl.DateTimeFormat` per locale in a `Map`,
preserving the "build it once" reason the single formatter existed. English is
`en-GB`: the app is read in Slovakia, where the day comes first.

## The legal pages are messages, not two components

The alternative was a `privacy-sk.tsx` / `privacy-en.tsx` pair, which keeps rich
JSX and lets a lawyer read each language as one file. The catalogue won because
it keeps *all* the app's prose in one place, and because a policy in JSON is
still one readable document per language — the JSX was never the point.

`t.rich` carries the markup. Emphasis and code spans are ordinary paired tags;
the operator's details from `src/lib/legal.ts` are **empty** tags —
`<contactEmail></contactEmail>` — because `t.rich` accepts a function per tag
but only strings and numbers as values, and a `<Detail>` is a whole element.
`useLegalTags()` builds that map once so forty paragraphs do not each repeat it.

`LegalDetail.hint` moved into `legal.hints.*` at the same time. It renders on
the page inside `[DOPLNIŤ: …]`, so it is a sentence a reader can see; what is
left in `legal.ts` is the value alone.

## The client is not sent the whole catalogue

`SERVER_ONLY_NAMESPACES` in the root layout holds `legal`, `metadata` and
`errors` back from `NextIntlClientProvider`. `legal` is most of the file by
weight and renders entirely on the server; the other two never cross the
boundary either. The brief is grandparents on phones, and tens of kilobytes of
policy prose in front of every route on every navigation works against it.

This fails loudly rather than quietly: next-intl throws for a namespace the
provider does not carry, so a new client component that needs one of the three
says so the first time it renders.

## `setLocale` is the second exception to the Server Action rules

Alongside `syncFromLive`. There is no caller to re-derive — the choice belongs
to a browser, not an account, and has to work on `/login` where nobody is signed
in yet. There is no group to enter and no row to write, so no `WHERE` clause.
And deliberately **no `notifyChanged`**: nothing changed for anybody else, and
pinging the group would re-render every other member's tab because one person
opened a menu.

Steps 3 and 5 do apply — the input is validated against `LOCALES`, and
`revalidatePath("/", "layout")` is what brings the whole page back in the new
language.

## Two labels live in code, not in the catalogues

`LOCALE_LABELS` in `src/i18n/config.ts` — "Use English" and "Použiť
slovenčinu". Each is written in the language it selects, so the menu item is
legible to somebody who opened the menu precisely because they cannot read the
rest of it. That property is why they are not in `sk.json` and `en.json`: a
translator who found "Use English" sitting in the Slovak file would helpfully
translate it, and the item would stop working for the person who needs it.

The flags are hand-drawn SVG in `src/components/flag-icons.tsx` for a duller
reason: lucide has no flags, and the regional-indicator emoji 🇬🇧 and 🇸🇰
render as the bare letters "GB" and "SK" on Windows.

## The manifest stays Slovak

`manifest.ts` is `force-static` and says `lang: "sk"`. Making it per-request
would mean giving that up — see
[UI patterns](ui-patterns.md#the-installable-app) — for one sentence nobody
reads after the install sheet closes. The app's name is its name in both
languages, and `lang` describes that document rather than the app behind it.
