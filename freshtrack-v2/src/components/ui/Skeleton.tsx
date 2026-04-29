import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  /** Number of skeleton lines/blocks to render */
  count?: number;
}

/** Pulsing placeholder for loading states */
export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-2xl bg-white/40 animate-pulse',
            className,
          )}
        />
      ))}
    </>
  );
}

interface PageSkeletonProps {
  cards?: number;
}

/** Generic page-level skeleton for route loading states */
export function PageSkeleton({ cards = 3 }: PageSkeletonProps) {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-2xl mb-5" />
      <Skeleton className="h-10 rounded-2xl mb-5 w-2/3" />
      <div className="grid gap-4">
        <Skeleton className="h-36 rounded-2xl" count={cards} />
      </div>
    </div>
  );
}

/** Dashboard skeleton — matches the stat card + section layout */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-72 ml-9" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Skeleton className="h-32" count={4} />
      </div>
      {/* Achievements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Skeleton className="h-20" count={2} />
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-36" count={3} />
      </div>
    </div>
  );
}

/** Items page skeleton */
export function ItemsSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div>
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-12 mb-4 rounded-2xl" />
      <Skeleton className="h-12 mb-6 rounded-2xl" />
      <div className="grid gap-3">
        <Skeleton className="h-24 rounded-2xl" count={4} />
      </div>
    </div>
  );
}

/** Waste page skeleton */
export function WasteSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Skeleton className="h-32" count={4} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48" count={2} />
      </div>
    </div>
  );
}
