import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Also the shell Next prefetches, so it is what renders when someone taps
 * through with no signal. The member and family pages under here bring their
 * own, so this one is the grid's alone.
 * docs/content/ui-patterns.md#the-app-route-group
 */
export default function GroupLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {/* The heading row: name on the left, Pozvať held to the right. */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-11 w-28 shrink-0" />
        </div>
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      {/* Mirrors MemberCard: the name centred, the action row below. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="min-h-44 gap-4 p-5">
            <div className="flex flex-1 flex-col items-center justify-center">
              <Skeleton className="h-8 w-36 max-w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-40 max-w-full" />
              <Skeleton className="ml-auto h-6 w-12 shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
