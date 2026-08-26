import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, MailOpenIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CreateGroupDialog } from "@/components/create-group-dialog";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccess } from "@/lib/data/access";
import { isConfigured } from "@/lib/supabase";

/**
 * Where an account with no group lands, and where the switcher sends anyone who
 * wants another one. Serves every signed-in visitor, so it never redirects a
 * member away — reaching it deliberately is the whole point.
 * docs/decisions/groups-and-invites.md
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [{ error }, access] = await Promise.all([searchParams, getAccess()]);
  // A signed-out visitor lands here with a refusal already in hand — from a
  // dead invite link, for instance — and /login shows the same "error" param,
  // so it carries over rather than being dropped on the way to signing in.
  if (access.kind === "anonymous") {
    redirect(error ? `/login?error=${encodeURIComponent(error)}` : "/login");
  }

  const hasGroup = access.kind === "member";
  const t = await getTranslations("start");

  return (
    <div className="space-y-6">
      {hasGroup ? (
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-4">
            <Link href="/">
              <ArrowLeftIcon />
              {t("back")}
            </Link>
          </Button>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-balance">
          {hasGroup ? t("anotherGroup") : t("welcome")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          {t("intro")}
        </p>
      </div>

      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("createTitle")}</CardTitle>
            <CardDescription>{t("createDescription")}</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto">
            <CreateGroupDialog />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("joinTitle")}</CardTitle>
            {/* No field to fill in: an invite is a link, not a code. */}
            <CardDescription>{t("joinDescription")}</CardDescription>
          </CardHeader>
          <CardFooter className="text-muted-foreground mt-auto gap-2">
            <MailOpenIcon className="size-5 shrink-0" aria-hidden />
            <span>{t("joinHint")}</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
