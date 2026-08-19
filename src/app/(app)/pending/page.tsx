import { redirect } from "next/navigation";
import { HourglassIcon } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { SetupRequired } from "@/components/setup-required";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccess } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

/**
 * The waiting room. `<LiveRefresh />` reaches this page too, so the moment an
 * admin approves someone the tab turns into the app by itself.
 * docs/content/live-updates.md#why-the-owners-tab-refreshes-too
 */
export default async function PendingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "active") redirect("/");

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HourglassIcon className="text-primary size-6 shrink-0" />
          Čaká sa na schválenie
        </CardTitle>
        <CardDescription>
          Prihlásil si sa ako <strong>{access.member.name}</strong>. Aby si videl
          zoznamy želaní, musí ťa najprv pustiť dnu niekto zo správcov rodiny.
          Táto stránka sa obnoví sama, hneď ako sa tak stane.
        </CardDescription>
      </CardHeader>

      <SignOutButton fullWidth />
    </Card>
  );
}
