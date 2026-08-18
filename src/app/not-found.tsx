import Link from "next/link";
import { MapPinOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The 404, and there is only one of it.
 *
 * A root `not-found.tsx` catches two different things: the `notFound()` thrown
 * by /member/[id] when the id in the URL belongs to nobody, and any URL the app
 * has no route for at all. Both land here, rendered inside the root layout — so
 * the wordmark, the font and the safe-area container come with it and there is
 * nothing to restate. `global-not-found.tsx` would bypass that layout and is
 * meant for apps with more than one root; this app has one.
 *
 * Nothing is fetched and nobody is redirected. A signed-out visitor who guesses
 * a URL sees this rather than the login page, because bouncing them would hide
 * the fact that the address is simply wrong. There is no data on the page, so
 * there is nothing here for the owner-claim rule to protect.
 */
export default function NotFound() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinOffIcon className="text-primary size-6 shrink-0" />
          Takáto stránka tu nie je
        </CardTitle>
        <CardDescription>
          Možno je odkaz zastaraný, alebo sa v adrese stratilo písmenko. Skús to
          od začiatku.
        </CardDescription>
      </CardHeader>

      <Button size="lg" asChild className="w-full">
        <Link href="/">Späť na zoznam rodiny</Link>
      </Button>
    </Card>
  );
}
