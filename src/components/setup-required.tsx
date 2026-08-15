import { DatabaseIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown instead of a stack trace when the Supabase environment variables are
 * missing, which is the state a fresh clone starts in.
 */
export function SetupRequired() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="text-primary size-5" />
          Ešte krok — pripoj databázu
        </CardTitle>
        <CardDescription>
          Aplikácia potrebuje projekt v Supabase, aby mohla čokoľvek ukladať.
        </CardDescription>
      </CardHeader>
      <ol className="text-muted-foreground list-decimal space-y-3 pl-5 text-sm">
        <li>
          Vytvor si bezplatný projekt na{" "}
          <a
            className="text-primary underline underline-offset-4"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            supabase.com/dashboard
          </a>
          .
        </li>
        <li>
          Otvor SQL editor a spusti{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0001_init.sql
          </code>{" "}
          z tohto repozitára.
        </li>
        <li>
          Skopíruj{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            .env.example
          </code>{" "}
          do{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          a doplň URL svojho projektu a kľúč{" "}
          <strong className="text-foreground">service_role</strong>.
        </li>
        <li>Reštartuj vývojový server.</li>
      </ol>
      <p className="text-muted-foreground text-xs">
        Kompletný návod nájdeš v súbore README.
      </p>
    </Card>
  );
}
