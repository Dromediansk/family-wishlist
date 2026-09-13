import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Its own shell, or the link out of the group page looks dead until it lands. */
export default function NotesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-28" />

      <div className="space-y-2">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <Card>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-12 w-full sm:w-32" />
      </Card>
    </div>
  );
}
