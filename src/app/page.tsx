import { redirect } from "next/navigation";
import { GiftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { SetupRequired } from "@/components/setup-required";
import { SubmitButton } from "@/components/submit-button";
import { getAccess } from "@/lib/data/access";
import { safeReturnTo } from "@/lib/invites";
import { isConfigured } from "@/lib/supabase";

/**
 * The front door, and the only screen a stranger can reach: sign in here, or be
 * sent on to wherever a session already belongs.
 *
 * Both jobs are one page on purpose. Split across `/` and `/login` they cost a
 * new visitor two round trips to reach the one screen they can use, and the
 * pair had to agree about which of them redirected where.
 *
 * proxy.ts already bounced signed-out visitors here, but that is an
 * optimisation: this is the check that decides, and the groupless case needs
 * the database. docs/decisions/groups-and-invites.md
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [params, access] = await Promise.all([searchParams, getAccess()]);
  const { error } = params;

  /*
   * `/join/{token}` sends a signed-out visitor here with the link it could not
   * open yet. The value comes off a query string, so it is checked before it is
   * rendered, let alone redirected to — anything else is dropped and this page
   * behaves as if it never arrived. docs/decisions/groups-and-invites.md#invites
   */
  const returnTo = safeReturnTo(params.returnTo);

  /*
   * Already signed in: the invite first, then where they belong. This ladder has
   * to end somewhere other than `/` — falling back to it would be a redirect to
   * this very page, and the browser would loop.
   */
  if (access.kind !== "anonymous") {
    if (returnTo) redirect(returnTo);
    if (access.kind === "groupless") redirect("/start");
    // The first group by join date — the same order the switcher shows.
    redirect(`/g/${access.viewer.groups[0].id}`);
  }

  const t = await getTranslations("login");

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

      {/* The header above carries no heading, so this is the page's only one. */}
      <h1 className="mt-6 text-2xl font-semibold text-balance sm:text-3xl">
        {t("name")}
      </h1>

      <p className="text-muted-foreground mt-3 text-balance">
        {t.rich("pitch", { break: () => <br /> })}
      </p>

      {/*
       * A plain form posting a Server Action, so sign-in works with JavaScript
       * off. `SubmitButton` is the only client component the card is allowed —
       * it reads this form's pending state for the spinner and nothing else.
       * The page itself stays a Server Component: keep it that way.
       *
       * `outline`, not primary: Google's green lobe would disappear into
       * --primary's fill, and their branding sanctions a neutral surface.
       */}
      <form action={signInWithGoogle} className="mt-8">
        {/* Re-checked in the action: a form field is a claim, not proof. */}
        {returnTo ? (
          <input type="hidden" name="returnTo" value={returnTo} />
        ) : null}
        <SubmitButton variant="outline" size="lg" className="w-full">
          <GoogleIcon />
          {t("signIn")}
        </SubmitButton>
      </form>

      {error ? (
        <p className="text-destructive mt-4" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-6 text-sm text-balance">
        {returnTo ? t("footnoteInvite") : t("footnote")}
      </p>
    </div>
  );
}
