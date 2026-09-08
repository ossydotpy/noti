import { useDashboardMetrics, useDashboardRecentNotifications } from "@/hooks/use-metrics";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { StatCard, StatCardFallback } from "@/components/stat-card";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/$wsSlug/dashboard")({
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  scheduled: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  processing: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function RecentNotificationsCard({
  notifications,
  isLoading,
}: {
  notifications: ReturnType<typeof useDashboardRecentNotifications>["data"];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">Recent notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The latest notification intents sent through this workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading recent notifications">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : notifications?.length ? (
        <div className="divide-y divide-border">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-center gap-4 rounded-lg py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {notification.title || notification.body}
                  </p>
                  <span className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                    statusStyles[notification.status] ?? "border-border bg-muted text-muted-foreground"
                  )}>
                    {notification.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {notification.subscriber_external_id} · {notification.channels.join(", ")}
                </p>
              </div>
              <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatDate(notification.created_at)}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Notifications sent to this workspace will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function InAppSummaryCard({ metrics }: { metrics: NonNullable<ReturnType<typeof useDashboardMetrics>["data"]> }) {
  const rows = [
    { label: "Unread", value: metrics.in_app.unread, tone: "warning" as const },
    { label: "Read", value: metrics.in_app.read, tone: "success" as const },
    { label: "Archived", value: metrics.in_app.archived, tone: "muted" as const },
  ];

  return (
    <StatCard
      title="In-app notifications"
      score={String(metrics.in_app.total)}
      subtitle="All-time"
      rows={rows}
      variant="secondary"
    />
  );
}

function DashboardPage() {
  const { activeWorkspaceId } = useWorkspaces();
  const metricsQuery = useDashboardMetrics(activeWorkspaceId ?? undefined);
  const recentQuery = useDashboardRecentNotifications(activeWorkspaceId ?? undefined);
  const metrics = metricsQuery.data;
  const resources = metrics?.resources ?? {
    subscribers: 0,
    topics: 0,
    templates: 0,
    providers: 0,
  };

  return (
    <div className="space-y-8 pb-8">
      {metricsQuery.isLoading || metricsQuery.isPending || !metrics ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCardFallback className="md:col-span-2 xl:col-span-1" />
          <StatCardFallback />
          <StatCardFallback />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Notifications"
            score={String(metrics.notifications.total)}
            subtitle="All-time"
            rows={[
              { label: "Pending", value: metrics.notifications.pending, tone: "warning" },
              { label: "Completed", value: metrics.notifications.completed, tone: "success" },
              { label: "Failed", value: metrics.notifications.failed, tone: "danger" },
            ]}
            variant="primary"
            className="md:col-span-2 xl:col-span-1"
          />
          <StatCard
            title="Delivery channels"
            score={String(metrics.notifications.success_total)}
            subtitle="Recorded successes"
            rows={[
              { label: "Push", value: metrics.notifications.push, tone: "info" },
              { label: "SMS", value: metrics.notifications.sms, tone: "warning" },
              { label: "In-app", value: metrics.notifications.in_app, tone: "success" },
            ]}
          />
          <InAppSummaryCard metrics={metrics} />
        </div>
      )}

      {metrics ? (
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight">Workspace setup</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Active resources currently configured for this workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Subscribers", resources.subscribers],
              ["Topics", resources.topics],
              ["Templates", resources.templates],
              ["Providers", resources.providers],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors duration-150 hover:bg-muted/40">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-medium tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <RecentNotificationsCard
        notifications={recentQuery.data}
        isLoading={recentQuery.isLoading || recentQuery.isPending}
      />
    </div>
  );
}
