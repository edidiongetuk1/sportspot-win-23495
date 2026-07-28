import { Skeleton } from "@/components/ui/skeleton";

export const MatchCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-3xl bg-card/60 backdrop-blur-sm border border-border p-5 md:p-6 animate-fade-in">
    <div className="flex items-center justify-between mb-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-12" />
    </div>
    <div className="space-y-3 mb-7">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-6" />
      </div>
      <div className="gold-hairline opacity-30" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-6" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  </div>
);
