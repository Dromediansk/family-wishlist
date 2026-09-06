import { getTranslations } from "next-intl/server";

import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { SubmitButton } from "@/components/submit-button";

/**
 * The Google button. Rendered twice — once in the hero, once at the end of the
 * page — and each is its own `<form>`: one form with two submit buttons would
 * post the same action from either place, but `useFormStatus` reads the form
 * rather than the button, so both would spin.
 *
 * A plain form posting a Server Action, so sign-in works with JavaScript off.
 * `SubmitButton` is the only client component on this page.
 *
 * `outline`, not primary: Google's green lobe would disappear into --primary's
 * fill, and their branding sanctions a neutral surface.
 */
export async function SignIn({
  returnTo,
  className,
}: Readonly<{ returnTo: string | null; className?: string }>) {
  const t = await getTranslations("login");

  return (
    <form action={signInWithGoogle} className={className}>
      {/* Re-checked in the action: a form field is a claim, not proof. */}
      {returnTo ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}
      <SubmitButton variant="outline" size="lg" className="w-full sm:w-auto">
        <GoogleIcon />
        {t("signIn")}
      </SubmitButton>
    </form>
  );
}
