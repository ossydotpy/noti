import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BellIcon,
  CheckCircleIcon,
  LightningIcon,
  PaperPlaneTiltIcon,
  TagIcon,
  UserIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useActiveWorkspaceId } from "@/hooks/use-workspaces";
import { useDashboardMetrics, useDashboardRecentNotifications } from "@/hooks/use-metrics";
import {
  useNotificationComposeContext,
  useSendNotification,
} from "@/hooks/use-notification-compose";
import type { ProviderChannel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/$wsSlug/send")({
  component: SendNotificationPage,
});

type Audience = "quick" | "topic" | "subscriber" | "bulk";

const AUDIENCES: {
  id: Audience;
  label: string;
  blurb: string;
  icon: typeof LightningIcon;
}[] = [
  { id: "quick", label: "Quick", blurb: "One subscriber, right now", icon: LightningIcon },
  { id: "topic", label: "Topic", blurb: "Everyone following a topic", icon: TagIcon },
  { id: "subscriber", label: "Subscriber", blurb: "One subscriber, with options", icon: UserIcon },
  { id: "bulk", label: "Bulk", blurb: "A list of subscriber IDs", icon: UsersThreeIcon },
];

const CHANNEL_META: { id: ProviderChannel; label: string; hint: string }[] = [
  { id: "push", label: "Push", hint: "Needs a push provider" },
  { id: "in_app", label: "In-app", hint: "Always available" },
  { id: "sms", label: "SMS", hint: "Needs an SMS provider" },
  { id: "email", label: "Email", hint: "No email driver yet" },
];

function parseBulkIds(raw: string): string[] {
  const parts = raw.split(/[\n,;\s]+/).map((p) => p.trim()).filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 500);
}

function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function SendNotificationPage() {
  const { wsSlug } = Route.useParams();
  const { workspaceId, workspace } = useActiveWorkspaceId();
  const compose = useNotificationComposeContext();
  const metricsQuery = useDashboardMetrics(workspaceId ?? undefined);
  const recentQuery = useDashboardRecentNotifications(workspaceId ?? undefined);
  const send = useSendNotification();

  const [audience, setAudience] = React.useState<Audience>("quick");
  const [topicSlug, setTopicSlug] = React.useState("");
  const [subscriberId, setSubscriberId] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [channels, setChannels] = React.useState<ProviderChannel[]>(["push", "in_app"]);
  const [priority, setPriority] = React.useState<"normal" | "high">("normal");
  const [scheduleEnabled, setScheduleEnabled] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");
  const channelsSynced = React.useRef(false);

  const context = compose.data;
  const configured = React.useMemo(
    () => new Set(context?.configured_channels ?? ["in_app"]),
    [context],
  );

  // Once real context arrives, drop any default channel that isn't configured.
  React.useEffect(() => {
    if (!context || channelsSynced.current) return;
    channelsSynced.current = true;
    setChannels((prev) => {
      const kept = prev.filter((c) => configured.has(c));
      return kept.length ? kept : (["in_app"] as ProviderChannel[]);
    });
  }, [context, configured]);

  const topics = React.useMemo(() => context?.topics ?? [], [context]);
  React.useEffect(() => {
    if (!topicSlug && topics.length) setTopicSlug(topics[0].slug);
  }, [topics, topicSlug]);

  const bulkIds = React.useMemo(() => parseBulkIds(bulkText), [bulkText]);
  const selectedTopic = topics.find((t) => t.slug === topicSlug);

  const eligible = React.useMemo(() => {
    if (audience === "topic") return selectedTopic?.active_subscribers ?? 0;
    if (audience === "bulk") return bulkIds.length;
    return subscriberId.trim() ? 1 : 0;
  }, [audience, selectedTopic, bulkIds, subscriberId]);

  const unconfiguredSelected = channels.filter((c) => !configured.has(c));

  const targetError = React.useMemo(() => {
    if (audience === "topic" && !topicSlug) return "Select a topic.";
    if ((audience === "quick" || audience === "subscriber") && !subscriberId.trim())
      return "Enter a subscriber external ID.";
    if (audience === "bulk" && bulkIds.length === 0)
      return "Paste at least one subscriber external ID.";
    return null;
  }, [audience, topicSlug, subscriberId, bulkIds]);

  const canSend =
    body.trim().length > 0 &&
    channels.length > 0 &&
    unconfiguredSelected.length === 0 &&
    !targetError &&
    !send.isPending &&
    !compose.isPending;

  const toggleChannel = (c: ProviderChannel) => {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setBulkText("");
    setSubscriberId("");
    setScheduleEnabled(false);
    setScheduledAt("");
    setPriority("normal");
  };

  const handleSend = async () => {
    if (!canSend) {
      if (targetError) toast.error(targetError);
      else if (!body.trim()) toast.error("Write a message body first.");
      else if (!channels.length) toast.error("Pick at least one channel.");
      else if (unconfiguredSelected.length)
        toast.error(`Configure a provider for: ${unconfiguredSelected.join(", ")}`);
      return;
    }
    const scheduledIso = scheduleEnabled ? toIsoOrNull(scheduledAt) : null;
    if (scheduleEnabled && !scheduledIso) {
      toast.error("Pick a valid scheduled date and time.");
      return;
    }
    try {
      const result = await send.mutateAsync({
        audience,
        subscriber_external_id:
          audience === "quick" || audience === "subscriber" ? subscriberId.trim() : undefined,
        subscriber_external_ids: audience === "bulk" ? bulkIds : undefined,
        topic_slug: audience === "topic" ? topicSlug : undefined,
        channels,
        content: { title: title.trim() || undefined, body: body.trim() },
        priority,
        scheduled_at: scheduledIso,
      });
      const when = scheduledIso ? "scheduled" : "queued";
      toast.success(`Notification ${when}`, {
        description: `${result.notifications_created} created · ${result.recipients_targeted} targeted${result.recipients_missing ? ` · ${result.recipients_missing} IDs not found` : ""}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send notification");
    }
  };

  const metrics = metricsQuery.data;
  const successTotal = metrics?.notifications.success_total ?? 0;
  const failureTotal = metrics?.notifications.failure_total ?? 0;
  const deliveryRate =
    successTotal + failureTotal > 0 ? Math.round((successTotal / (successTotal + failureTotal)) * 1000) / 10 : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <style>{`
        @keyframes send-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .send-rise { animation: send-rise 200ms cubic-bezier(0.23,1,0.32,1) both; }
        @media (prefers-reduced-motion: reduce) { .send-rise { animation: none; } }
        @media (hover: hover) and (pointer: fine) { .send-hover:hover { transform: translateY(-1px); } }
      `}</style>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PaperPlaneTiltIcon className="size-3.5 text-primary" weight="fill" />
            Message center
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Send a notification</h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            {workspace ? `Sending as ${workspace.name}. ` : ""}Every control below reads live
            workspace data — no placeholders.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "size-2 rounded-full",
              compose.isError ? "bg-destructive" : configured.size > 1 ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {compose.isPending
            ? "Loading workspace…"
            : compose.isError
              ? "Could not load workspace data"
              : `${context?.active_subscribers ?? 0} active subscribers · ${configured.size} channel${configured.size === 1 ? "" : "s"} ready`}
        </div>
      </header>

      {compose.isError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <WarningCircleIcon className="size-4 shrink-0 text-destructive" weight="fill" />
          <p>
            Could not load topics and channel status.{" "}
            <button type="button" onClick={() => compose.refetch()} className="font-medium underline underline-offset-2">
              Retry
            </button>
          </p>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Audience */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Audience</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Who receives this send.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((item, i) => {
                const active = audience === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAudience(item.id)}
                    aria-pressed={active}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={cn(
                      "send-rise send-hover flex items-start gap-3 rounded-xl border p-3 text-left",
                      "transition-[transform,border-color,background-color,opacity] duration-150 ease-out active:scale-[0.97]",
                      active
                        ? "border-primary/60 bg-accent/50"
                        : "border-border/80 hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] duration-150 ease-out",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <item.icon className="size-4" weight={active ? "fill" : "regular"} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{item.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Target inputs — all real */}
            <div className="mt-4 rounded-xl bg-muted/30 p-3.5">
              {audience === "topic" && (
                <div className="space-y-2">
                  <label htmlFor="send-topic" className="text-xs font-medium">
                    Topic {selectedTopic ? `· ${selectedTopic.active_subscribers} subscribed` : ""}
                  </label>
                  <select
                    id="send-topic"
                    value={topicSlug}
                    onChange={(e) => setTopicSlug(e.target.value)}
                    disabled={!topics.length}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.name} — {t.active_subscribers} subscribed
                      </option>
                    ))}
                  </select>
                  {!topics.length && !compose.isPending && (
                    <p className="text-xs text-muted-foreground">
                      No active topics yet. Create one under Topics first.
                    </p>
                  )}
                </div>
              )}
              {(audience === "quick" || audience === "subscriber") && (
                <div className="space-y-2">
                  <label htmlFor="send-subscriber" className="text-xs font-medium">
                    Subscriber external ID
                  </label>
                  <Input
                    id="send-subscriber"
                    value={subscriberId}
                    onChange={(e) => setSubscriberId(e.target.value)}
                    placeholder="e.g. user_123"
                    autoComplete="off"
                  />
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Must match an active subscriber in this workspace. Sends to all of their
                    devices for the selected channels.
                  </p>
                </div>
              )}
              {audience === "bulk" && (
                <div className="space-y-2">
                  <label htmlFor="send-bulk" className="text-xs font-medium">
                    Subscriber external IDs {bulkIds.length ? `· ${bulkIds.length} parsed` : ""}
                  </label>
                  <Textarea
                    id="send-bulk"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"user_123\nuser_456\nuser_789"}
                    className="min-h-[96px] resize-y font-mono text-xs"
                  />
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    One ID per line (commas also work). Duplicates are removed, capped at 500.
                    Unknown IDs are reported after sending.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Message */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Message</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Title is optional. Body is required.</p>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="send-title" className="text-xs font-medium">Title</label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{title.length}/80</span>
                </div>
                <Input
                  id="send-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="e.g. Your order has shipped"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="send-body" className="text-xs font-medium">Message</label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{body.length}/240</span>
                </div>
                <Textarea
                  id="send-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 240))}
                  placeholder="Write something useful…"
                  className="min-h-[104px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium">Channels</span>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_META.map((c) => {
                    const ready = configured.has(c.id);
                    const on = channels.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={!ready}
                        onClick={() => toggleChannel(c.id)}
                        aria-pressed={on}
                        title={ready ? c.label : c.hint}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px]",
                          "transition-[transform,border-color,background-color,opacity] duration-150 ease-out active:scale-[0.97]",
                          !ready && "cursor-not-allowed opacity-45",
                          on
                            ? "border-primary/60 bg-accent text-accent-foreground"
                            : "border-border text-muted-foreground hover:bg-muted/60",
                        )}
                      >
                        {on && ready && <CheckCircleIcon className="size-3.5" weight="fill" />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                {unconfiguredSelected.length > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                    {unconfiguredSelected.join(", ")} has no configured provider.{" "}
                    <Link
                      to="/$wsSlug/providers"
                      params={{ wsSlug }}
                      className="font-medium underline underline-offset-2"
                    >
                      Configure providers
                    </Link>
                  </p>
                )}
              </div>

              <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Priority</span>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/30 p-1">
                    {(["normal", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        aria-pressed={priority === p}
                        className={cn(
                          "h-7 rounded-md text-xs font-medium capitalize",
                          "transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
                          priority === p ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="send-schedule" className="flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      id="send-schedule-check"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="size-3.5 accent-primary"
                    />
                    Schedule for later
                  </label>
                  <Input
                    id="send-schedule"
                    type="datetime-local"
                    value={scheduledAt}
                    disabled={!scheduleEnabled}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="disabled:opacity-50"
                  />
                </div>
              </div>

              {send.isError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {send.error instanceof Error ? send.error.message : "Send failed."}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2.5 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={resetComposer}
                  className="rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-[color,opacity] duration-150 ease-out hover:text-foreground active:scale-[0.97]"
                >
                  Clear composer
                </button>
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="h-9 px-5 transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                >
                  {send.isPending ? "Sending…" : scheduleEnabled && scheduledAt ? "Schedule send" : "Send now"}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Right rail: preview + real estimates */}
        <aside className="space-y-5 lg:sticky lg:top-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 className="text-[13px] font-semibold">Preview</h2>
                <p className="text-[11px] text-muted-foreground">Updates as you type</p>
              </div>
              <BellIcon className="size-4 text-primary" weight="fill" />
            </div>
            <div className="border-t border-border/70 bg-muted/30 p-4">
              <div className="rounded-xl border border-border bg-background p-3.5 shadow-xs transition-[opacity,transform] duration-200 ease-out">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
                    <BellIcon className="size-3 text-primary" weight="fill" />
                  </span>
                  noti · now
                </p>
                <p className="mt-2 text-sm font-semibold leading-5">
                  {title.trim() || <span className="text-muted-foreground/70">Your title</span>}
                </p>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                  {body.trim() || "Your message will appear here."}
                </p>
                <p className="mt-2.5 flex flex-wrap gap-1">
                  {channels.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {c.replace("_", "-")}
                    </span>
                  ))}
                  {priority === "high" && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      high priority
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-[13px] font-semibold">Delivery estimate</h2>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">
                {compose.isPending ? "…" : eligible.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">recipients this send</span>
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Active subscribers</dt>
                <dd className="font-medium tabular-nums">{context?.active_subscribers ?? "…"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Active topics</dt>
                <dd className="font-medium tabular-nums">{topics.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">All-time delivery</dt>
                <dd className="font-medium tabular-nums">
                  {metricsQuery.isPending ? "…" : deliveryRate === null ? "no sends yet" : `${deliveryRate}%`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total sends</dt>
                <dd className="font-medium tabular-nums">{metrics?.notifications.total ?? "…"}</dd>
              </div>
            </dl>
            {!!recentQuery.data?.length && (
              <div className="mt-3 border-t border-border/70 pt-3">
                <p className="text-[11px] font-medium text-muted-foreground">Last sends</p>
                <ul className="mt-1.5 space-y-1.5">
                  {recentQuery.data.slice(0, 3).map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">{n.title || n.body}</span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {n.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
