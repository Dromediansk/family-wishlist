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
 * has no route for at all. Both land here, and both land here *without* the
 * header: the boundary a root `not-found.tsx` creates sits inside the root
 * layout but above `(app)/layout.tsx`, so a `notFound()` thrown inside the group
 * unwinds past the header on its way out. Which is why this file brings its own
 * `<main>` — and why the card below carries its own way back.
 *
 * Keeping a single file is deliberate. An `(app)/not-found.tsx` would restore
 * the header for the member case, but it would not catch unmatched URLs, so the
 * root file could never be deleted and the card would have to live in a third
 * place to avoid being written twice. `global-not-found.tsx` is not the answer
 * either: it bypasses the root layout, losing the font and the safe-area frame,
 * and it is meant for apps with more than one root. This app has one.
 *
 * The font and the safe-area container do still come with it.
 *
 * Nothing is fetched and nobody is redirected. A signed-out visitor who guesses
 * a URL sees this rather than the login page, because bouncing them would hide
 * the fact that the address is simply wrong. There is no data on the page, so
 * there is nothing here for the owner-claim rule to protect.
 */
export default function NotFound() {
  return (
    <main className="flex-1">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinOffIcon className="text-primary size-6 shrink-0" />
            Takáto stránka tu nie je
          </CardTitle>
          <CardDescription>
            Možno je odkaz zastaraný, alebo sa v adrese stratilo písmenko. Skús
            to od začiatku.
          </CardDescription>
        </CardHeader>

        <Button size="lg" asChild className="w-full">
          <Link href="/">Späť na zoznam rodiny</Link>
        </Button>
      </Card>
    </main>
  );
}
