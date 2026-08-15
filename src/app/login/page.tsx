import { redirect } from "next/navigation";
import { GiftIcon } from "lucide-react";

import { signInWithGoogle } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="text-primary size-5" />
          Prihlás sa
        </CardTitle>
        <CardDescription>
          Zoznam želaní je len pre rodinu. Prihlás sa svojím Google účtom — ak si
          tu prvýkrát, správca ťa najprv musí pustiť dnu.
        </CardDescription>
      </CardHeader>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon />
          Prihlásiť sa cez Google
        </Button>
      </form>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
