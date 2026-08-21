import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Its own shell, or the admin menu item looks dead until the list arrives. */
export default function FamilyLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-28" />

      <div className="space-y-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <Card className="gap-0 py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b py-5 last:border-b-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-24 max-w-full" />
            </div>
            <Skeleton className="h-11 w-28 shrink-0" />
          </div>
        ))}
      </Card>

      {/* Mirrors the Pozvánky section: heading, the create button, the list. */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>

        <Skeleton className="h-11 w-full sm:w-48" />

        <div className="divide-y">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="size-5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-4 w-20 max-w-full" />
              </div>
              <Skeleton className="size-11 shrink-0" />
              <Skeleton className="size-11 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* And the delete section, or the page grows under whoever is reading it. */}
      <div className="space-y-4 border-t pt-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>

        <Skeleton className="h-11 w-full sm:w-48" />
      </div>
    </div>
  );
}
