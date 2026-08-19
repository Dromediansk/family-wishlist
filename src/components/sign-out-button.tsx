import { LogOutIcon } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

/**
 * A plain form posting to a Server Action, so signing out works with JavaScript
 * disabled. Only the button itself is a client component, for the spinner.
 */
export function SignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <form action={signOut}>
      <SubmitButton
        variant="outline"
        size={fullWidth ? "lg" : "sm"}
        className={fullWidth ? "w-full" : undefined}
      >
        <LogOutIcon />
        Odhlásiť sa
      </SubmitButton>
    </form>
  );
}
