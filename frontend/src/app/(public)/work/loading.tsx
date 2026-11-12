import { Skeleton } from "@/components/ui/states";

export default function WorkLoading() {
  return (
    <div className="container-q py-24" aria-busy="true" aria-label="Loading projects">
      <Skeleton className="mx-auto h-24 max-w-xl" />
      <div className="mt-16 grid gap-6 tablet:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}
      </div>
    </div>
  );
}
