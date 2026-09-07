import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import { useSubscriber } from "@/hooks/use-subscribers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { SubscriberOverview } from "@/components/subscribers/subscriber-overview";
import { SubscriberSubscriptions } from "@/components/subscribers/subscriber-subscriptions";
import { SubscriberDevices } from "@/components/subscribers/subscriber-devices";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const Route = createFileRoute("/_authenticated/$wsSlug/subscribers/$subscriberId")({
  component: SubscriberDetailPage,
});

function SubscriberDetailPage() {
  const { wsSlug, subscriberId } = Route.useParams();
  const [isEditing, setIsEditing] = useState(false);

  const { data: subscriber, isLoading } = useSubscriber(subscriberId);

  const displayName = subscriber
    ? subscriber.first_name || subscriber.last_name
      ? `${subscriber.first_name || ""} ${subscriber.last_name || ""}`.trim()
      : "Unnamed Subscriber"
    : "Loading...";

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Subscriber not found</h1>
          <p className="text-muted-foreground">
            The subscriber you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link to="/$wsSlug/subscribers" params={{ wsSlug }}>
            <Button variant="outline" className="rounded-2xl h-12 px-6">
              Back to Subscribers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link to="/$wsSlug/subscribers" params={{ wsSlug }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-2xl"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <div className="flex items-center gap-3">
                <code className="text-xs bg-muted/50 px-2 py-1 rounded-lg font-mono text-muted-foreground">
                  {subscriber.external_id}
                </code>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    subscriber.is_active
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                  )}
                >
                  {subscriber.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Created</span>
          <span className="font-medium text-foreground">
            {formatDistanceToNow(new Date(subscriber.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
            <TabsTrigger
              value="overview"
              className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="subscriptions"
              className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Subscriptions
            </TabsTrigger>
            <TabsTrigger
              value="devices"
              className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              Devices
              {subscriber.device_count > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                  {subscriber.device_count}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SubscriberOverview
              subscriber={subscriber}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
            />
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <SubscriberSubscriptions subscriberId={subscriberId} />
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <SubscriberDevices devices={subscriber?.devices ?? []} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
