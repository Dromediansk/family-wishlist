import { redirect } from "next/navigation";
import { GiftIcon } from "lucide-react";

import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { SetupRequired } from "@/components/setup-required";
import { SubmitButton } from "@/components/submit-button";
import { getAccess } from "@/lib/data/access";
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
     * `min-h-full`, not `h-full`: a fixed-height flex box whose content is
     * taller has negative free space, so `justify-center` would push the tile
     * above the start edge where no scroll can reach it.
     *
     * `max-w-sm` (~45ch) rather than the repo's 62ch cap — that rule is for a
     * left-aligned column, and centred text wants the shorter line.
     */
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center text-center">
      {/*
       * The same recipe as the home-screen icon: 36/64 is the 56% ratio, and any
       * rescale has to keep it. `rounded-xl` because --radius-xl derives from
       * the app's own --radius, unlike stock --radius-2xl.
       */}
      <div className="bg-primary mx-auto flex size-16 items-center justify-center rounded-xl">
        <GiftIcon
          className="text-primary-foreground size-9"
          strokeWidth={1.75}
        />
      </div>

      {/* The header does not render here, so this is the page's only heading. */}
      <h1 className="mt-6 text-2xl font-semibold text-balance sm:text-3xl">
        Prajem si..
      </h1>

      <p className="text-muted-foreground mt-3 text-balance">
        Zapíš si, čo by si chcel.
        <br /> Ostatní potichu vyberú darček a ty sa do poslednej chvíle nič
        nedozvieš.
      </p>

      {/*
       * A plain form posting a Server Action, so sign-in works with JavaScript
       * off. `SubmitButton` is the only client component the page is allowed —
       * it reads this form's pending state for the spinner and nothing else.
       * The page itself stays a Server Component: keep it that way.
       *
       * `outline`, not primary: Google's green lobe would disappear into
       * --primary's fill, and their branding sanctions a neutral surface.
       */}
      <form action={signInWithGoogle} className="mt-8">
        <SubmitButton variant="outline" size="lg" className="w-full">
          <GoogleIcon />
          Prihlásiť sa
        </SubmitButton>
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
