import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The root `loading.tsx` used to stand in for this route by accident; now that
 * it is scoped to `/`, admin navigation needs its own shell or the menu item
 * looks dead until the member list arrives.
 */
export default function FamilyLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />

      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card className="gap-0 py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b py-4 last:border-b-0"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28 shrink-0" />
          </div>
        ))}
      </Card>
    </div>
  );
}
