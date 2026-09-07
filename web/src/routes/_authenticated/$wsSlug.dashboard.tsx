import { useDashboardMetrics } from "@/hooks/use-metrics";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { StatCard, StatCardFallback } from "@/components/stat-card";
import { PlusIcon, TargetIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import ChevronRight from "@/components/ui/chevron-right";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$wsSlug/dashboard")({
  component: DashboardPage,
});

function RecentEventsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="lg:col-span-2 rounded-xl border border-border bg-card p-6 relative overflow-hidden group dark:border-white/5 dark:bg-white/1"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight dark:text-white uppercase">
            Recent Infrastructure Events
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 dark:text-neutral-500">
            Latest logs from the notification pipeline.
          </p>
        </div>
        <button className="text-xs font-bold text-primary hover:text-white hover:bg-primary transition-all bg-primary/10 dark:bg-primary/10 px-4 py-1.5 rounded-lg uppercase tracking-wider">
          View Logs
        </button>
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all group/row cursor-default"
          >
            <div className="h-2 w-2 rounded-full bg-primary/20 group-hover/row:bg-primary transition-colors" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 flex-1 bg-muted/50 animate-pulse rounded" />
            <div className="text-[10px] font-mono text-muted-foreground opacity-10 md:opacity-0 group-hover/row:opacity-100 transition-opacity">
              07:22:AM
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function QuickControlsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between dark:border-white/5 dark:bg-white/1"
    >
      <div className="flex-1">
        <h3 className="text-sm font-bold text-foreground tracking-tight dark:text-white uppercase">
          Quick Controls
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 dark:text-neutral-500">
          Manage your core service clusters.
        </p>
        <div className="mt-6 space-y-3">
          <button className="w-full flex items-center justify-between group bg-neutral-900 dark:bg-white p-3.5 rounded-xl font-bold text-white dark:text-black hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm text-sm uppercase tracking-wider">
            <span className="flex items-center gap-3">
              <PlusIcon className="size-4" />
              New Broadcast
            </span>
            <ChevronRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="w-full flex items-center justify-between group bg-white dark:bg-neutral-900 border border-border dark:border-white/10 p-3.5 rounded-xl font-bold text-foreground dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-sm uppercase tracking-wider">
            <span className="flex items-center gap-3">
              <TargetIcon className="size-4" />
              Define Segment
            </span>
            <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-600 dark:group-hover:text-white transition-opacity" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPage() {
  const { activeWorkspaceId } = useWorkspaces();
  const { data: metrics, isLoading, isPending } = useDashboardMetrics(activeWorkspaceId ?? undefined);

  const stats = metrics
    ? [
        {
          title: "Notifications",
          score: String(metrics.notifications.total),
          subtitle: "All-time",
          rows: [
            { label: "Pending", value: String(metrics.notifications.pending), tone: "info" as const },
            { label: "Completed", value: String(metrics.notifications.completed), tone: "success" as const },
            { label: "Failed", value: String(metrics.notifications.failed), tone: "danger" as const },
          ],
          variant: "primary" as const,
        },
        {
          title: "Channels",
          score: "Breakdown",
          subtitle: "",
          rows: [
            { label: "Push", value: String(metrics.notifications.push), tone: "info" as const },
            { label: "In-App", value: String(metrics.notifications.in_app), tone: "success" as const },
            { label: "SMS", value: String(metrics.notifications.sms), tone: "warning" as const },
          ],
          variant: "secondary" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-8 pb-8">
      {isLoading || isPending || !metrics ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCardFallback className="md:col-span-2 xl:col-span-1" />
          <StatCardFallback />
          <StatCardFallback />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.title}
              {...stat}
              className={index === 0 ? "md:col-span-2 xl:col-span-1" : ""}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentEventsCard />
        <QuickControlsCard />
      </div>
    </div>
  );
}
