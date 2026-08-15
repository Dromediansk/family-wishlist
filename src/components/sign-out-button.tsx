import { LogOutIcon } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * A plain form posting to a Server Action, so signing out works with JavaScript
 * disabled and needs no client component.
 */
export function SignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className={fullWidth ? "w-full" : undefined}
      >
        <LogOutIcon />
        Odhlásiť sa
      </Button>
    </form>
  );
}
