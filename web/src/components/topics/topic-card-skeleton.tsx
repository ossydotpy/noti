import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

interface TopicCardSkeletonProps {
  index?: number;
}

export function TopicCardSkeleton({ index = 0 }: TopicCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-11 w-11 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full" />

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </motion.div>
  );
}
