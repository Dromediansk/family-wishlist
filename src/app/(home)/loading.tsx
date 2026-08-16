import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Beyond the usual loading state, this boundary is what Next prefetches as the
 * route's shell — so it's also what renders when someone taps through with no
 * signal, instead of the tap appearing to do nothing.
 *
 * The `(home)` route group is why this lives one directory down instead of
 * beside the root layout. A `loading.tsx` wraps its whole segment subtree, so
 * at `src/app/` this grid of member cards would be the fallback for *every*
 * route — you'd see it flash on the way to a wish list before that route's own
 * skeleton took over. The group scopes it to `/` without changing the URL.
 */
export default function HomeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="gap-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-36" />
          </Card>
        ))}
      </div>
    </div>
  );
}
