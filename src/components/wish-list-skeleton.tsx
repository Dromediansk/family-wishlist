import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared shell for every route that renders a list of wishes in a card —
 * `/buying`, `/member/[id]`, and the two history pages. All open with a back
 * link, a heading and a subtitle, then the list itself.
 */
export function WishListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-28" />

      <div className="space-y-2">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <Card className="gap-0 py-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b py-5 last:border-b-0"
          >
            {/* `min-w-0` or the fixed-width bars below set this column's
                automatic minimum size, and on a narrow phone the row overflows
                the card — pushing the action bar past the right padding. */}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
            <Skeleton className="h-11 w-28 shrink-0" />
          </div>
        ))}
      </Card>
    </div>
  );
}
