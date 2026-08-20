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
 * The 404, and there is only one of it — it catches both `notFound()` from
 * anywhere under /g/[groupId] and any unmatched URL, and both arrive without the
 * header, hence its own `<main>` and its own way back. Keeping one file is
 * deliberate; see docs/content/ui-patterns.md#the-404.
 *
 * Nothing is fetched and nobody is redirected: bouncing a signed-out visitor
 * would hide the fact that the address is simply wrong.
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
