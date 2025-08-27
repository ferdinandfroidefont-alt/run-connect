import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50 relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      {...props}
    />
  );
};

// Prebuilt skeleton components for common use cases
export const UserSkeleton = () => (
  <div className="flex items-center space-x-4 p-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-4 w-[100px]" />
    </div>
  </div>
);

export const LeaderboardSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-5 w-[60px] ml-auto" />
          <Skeleton className="h-3 w-[40px] ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export const SessionCardSkeleton = () => (
  <div className="p-4 border rounded-lg space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-[100px]" />
      <Skeleton className="h-4 w-[60px]" />
    </div>
    <Skeleton className="h-4 w-full" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[80px]" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-[120px]" />
      <Skeleton className="h-8 w-[80px]" />
    </div>
  </div>
);