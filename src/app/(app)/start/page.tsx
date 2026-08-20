import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, MailOpenIcon } from "lucide-react";

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
 * docs/content/groups.md
 */
export default async function StartPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();
  if (access.kind === "anonymous") redirect("/login");

  const hasGroup = access.kind === "member";

  return (
    <div className="space-y-6">
      {hasGroup ? (
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-4">
            <Link href="/">
              <ArrowLeftIcon />
              Späť
            </Link>
          </Button>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-balance">
          {hasGroup ? "Ďalšia skupina" : "Vitaj!"}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Skupina je rodina alebo partia, ktorá si navzájom vidí zoznamy želaní.
          Založ si vlastnú alebo sa pridaj do cudzej.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vytvoriť skupinu</CardTitle>
            <CardDescription>
              Založ novú skupinu. Budeš jej správca a ostatných do nej pozveš
              odkazom.
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto">
            <CreateGroupDialog />
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pridať sa do skupiny</CardTitle>
            {/* No field to fill in: a pozvánka is a link, not a code. */}
            <CardDescription>
              Otvor pozvánku, ktorú ti niekto poslal.
            </CardDescription>
          </CardHeader>
          <CardFooter className="text-muted-foreground mt-auto gap-2">
            <MailOpenIcon className="size-5 shrink-0" aria-hidden />
            <span>Odkaz ťa pridá do skupiny sám.</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
