import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateCardSkeletonProps {
  index?: number;
}

export function TemplateCardSkeleton({ index = 0 }: TemplateCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="relative bg-card border rounded-xl p-4 overflow-hidden">
        {/* Top row: Avatar, Title, Actions */}
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 pt-0.5 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Content preview */}
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </motion.div>
  );
}
