import { motion } from "motion/react";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import type { TopicStats } from "@/hooks/use-topics";
import { Skeleton } from "@/components/ui/skeleton";

interface TopicStatsCardsProps {
  stats: TopicStats | undefined;
  isLoading: boolean;
}

function StatCard({
  title,
  value,
  description,
  index = 0,
}: {
  title: string;
  value: string | number;
  description?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <InfoCard className="h-full">
        <InfoCardHeader className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </InfoCardHeader>
        <InfoCardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{value}</span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </InfoCardContent>
      </InfoCard>
    </motion.div>
  );
}

export function TopicStatsCards({ stats, isLoading }: TopicStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <div className="rounded-3xl border border-border p-6 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const totalSources = Object.values(stats.by_source).reduce(
    (acc, count) => acc + count,
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Subscribers"
        value={stats.active_subscriptions.toLocaleString()}
        description={`${stats.inactive_subscriptions} inactive`}
        index={0}
      />
      <StatCard
        title="Total Subscriptions"
        value={stats.total_subscriptions.toLocaleString()}
        description="All time subscriptions"
        index={1}
      />
      <StatCard
        title="Subscription Sources"
        value={Object.keys(stats.by_source).length}
        description={`${totalSources} total from all sources`}
        index={2}
      />
      <StatCard
        title="Engagement Rate"
        value={`${Math.round(
          (stats.active_subscriptions / Math.max(stats.total_subscriptions, 1)) *
            100
        )}%`}
        description="Active vs total ratio"
        index={3}
      />
    </div>
  );
}
