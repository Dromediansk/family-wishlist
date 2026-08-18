import { redirect } from "next/navigation";
import { GiftIcon } from "lucide-react";

import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { getAccess } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [{ error }, access] = await Promise.all([searchParams, getAccess()]);

  // Already signed in — the home page will sort out where they belong.
  if (access.kind !== "anonymous") redirect("/");

  return (
    /*
     * Centred in whatever height `login/layout.tsx`'s <main className="flex-1">
     * was given.
     *
     * `min-h-full` rather than `h-full`, and the difference matters on a phone
     * held sideways. A fixed-height flex box whose content is taller than it has
     * negative free space, so `justify-center` overflows it symmetrically and
     * pushes the tile above the container's own start edge — where no scroll can
     * reach it. As a floor, the content simply grows the column past 100dvh and
     * the document scrolls instead.
     *
     * `max-w-sm` is 384px. The card this replaced was `max-w-md` with `p-6`,
     * i.e. 400px of content, so the measure barely moves. The repo's 62ch cap is
     * a different rule for a different shape — a left-aligned intro under a
     * left-aligned h1 in a full-width column — and at roughly 45ch this is well
     * inside it, so repeating it here would be dead code. Centred text wants the
     * shorter line anyway: both edges are ragged, so the eye has no fixed return
     * point.
     */
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center text-center">
      {/*
       * The app mark, drawn to the same recipe as the installed home-screen icon
       * (src/lib/icon-artwork.tsx): full-bleed primary, gift glyph at 56% of the
       * tile, strokeWidth 1.75 rather than lucide's default 2. 36/64 = 56.25% is
       * the only pair of stock spacing steps that hits that ratio, which is why
       * this size is fixed rather than responsive.
       *
       * `rounded-xl` over `rounded-2xl`: the two are both 16px today, but
       * --radius-xl is derived from the app's own --radius while --radius-2xl is
       * stock Tailwind. Re-tuning the radius should move this tile with the rest
       * of the app, not leave it behind.
       *
       * No aria-hidden: lucide adds it to an unlabelled icon by itself, and the
       * <h1> below says the same thing in words.
       */}
      <div className="bg-primary mx-auto flex size-16 items-center justify-center rounded-xl">
        <GiftIcon
          className="text-primary-foreground size-9"
          strokeWidth={1.75}
        />
      </div>

      {/*
       * The header does not render on this route, so this is the page's only
       * branding and its only heading — and its first one: `CardTitle` is a div,
       * so the old design put no heading in the tree at all.
       *
       * text-3xl is the last tuned step in the scale. text-4xl is 2px bigger and
       * drops the letter-spacing, so the ladder stops here.
       */}
      <h1 className="mt-6 text-2xl font-semibold text-balance sm:text-3xl">
        Rodinný zoznam želaní
      </h1>

      <p className="text-muted-foreground mt-3 text-balance">
        Zapíš si, čo by si chcel. Ostatní potichu vyberú darček a ty sa do
        poslednej chvíle nič nedozvieš.
      </p>

      {/*
       * A Server Action posted by a plain form, so signing in still works with
       * JavaScript off. Nothing here may become a client component.
       *
       * `outline` rather than a solid primary, even though this is the only
       * action on the page. --primary is #008039, and the green lobe of Google's
       * mark is #34A853 — near enough in hue and lightness to disappear into the
       * fill, with #4285F4 vibrating against it. Google's own branding sanctions
       * white, grey and black button surfaces for exactly this reason, and
       * `outline`'s bg-background is one in both themes. The green is already
       * spent on the tile above.
       */}
      <form action={signInWithGoogle} className="mt-8">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <GoogleIcon />
          Prihlásiť sa cez Google
        </Button>
      </form>

      {error ? (
        <p className="text-destructive mt-4" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-6 text-sm text-balance">
        Zoznam je len pre rodinu — ak si tu prvýkrát, správca ťa najprv musí
        pustiť dnu.
      </p>
    </div>
  );
}
