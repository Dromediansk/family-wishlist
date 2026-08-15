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
          Almost there — connect a database
        </CardTitle>
        <CardDescription>
          This app needs a Supabase project before it can store anything.
        </CardDescription>
      </CardHeader>
      <ol className="text-muted-foreground list-decimal space-y-3 pl-5 text-sm">
        <li>
          Create a free project at{" "}
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
          Open the SQL editor and run{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0001_init.sql
          </code>{" "}
          from this repository.
        </li>
        <li>
          Copy{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            .env.example
          </code>{" "}
          to{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          and fill in your project URL and{" "}
          <strong className="text-foreground">service_role</strong> key.
        </li>
        <li>Restart the dev server.</li>
      </ol>
      <p className="text-muted-foreground text-xs">
        Full instructions are in the README.
      </p>
    </Card>
  );
}
