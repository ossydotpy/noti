import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import {
  useTopic,
  useTopicStats,
  useTopicSubscriptions,
  useUpdateTopic,
  useDeleteTopic,
  useActivateTopic,
  useRemoveSubscription,
} from "@/hooks/use-topics";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicHeader } from "@/components/topics/topic-header";
import { TopicStatsCards } from "@/components/topics/topic-stats-cards";
import { TopicDetails } from "@/components/topics/topic-details";
import { SubscriptionList } from "@/components/topics/subscription-list";
import { SourceDistribution } from "@/components/topics/source-distribution";
import { EditTopicDialog } from "@/components/topics/edit-topic-dialog";
import { DeleteTopicDialog } from "@/components/topics/delete-topic-dialog";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export const Route = createFileRoute("/_authenticated/$wsSlug/topics/$topicId")({
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const { wsSlug, topicId } = Route.useParams();
  const navigate = useNavigate();

  const { data: topic, isLoading: isLoadingTopic } = useTopic(topicId);
  const { data: stats, isLoading: isLoadingStats } = useTopicStats(topicId);
  const { data: subscriptions, isLoading: isLoadingSubscriptions } =
    useTopicSubscriptions(topicId);
  const updateTopic = useUpdateTopic(topicId || "");
  const deleteTopic = useDeleteTopic();
  const activateTopic = useActivateTopic();
  const removeSubscription = useRemoveSubscription();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (topicId) {
      navigator.clipboard.writeText(topicId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success("Topic ID copied to clipboard");
    }
  };

  const handleSave = async (data: { name: string; description: string }) => {
    try {
      await updateTopic.mutateAsync(data);
      toast.success("Topic updated successfully");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update topic");
    }
  };

  const handleDelete = async () => {
    if (!topicId) return;

    try {
      await deleteTopic.mutateAsync(topicId);
      toast.success("Topic deleted successfully");
      navigate({ to: "/$wsSlug/topics", params: { wsSlug } });
    } catch {
      toast.error("Failed to delete topic");
    }
  };

  const handleActivate = async () => {
    if (!topicId) return;

    try {
      await activateTopic.mutateAsync(topicId);
      toast.success("Topic activated successfully");
    } catch {
      toast.error("Failed to activate topic");
    }
  };

  const handleRemoveSubscription = async (subscriptionId: string) => {
    if (!topicId) return;

    try {
      await removeSubscription.mutateAsync({ topicId, subscriptionId });
      toast.success("Subscription removed");
    } catch {
      toast.error("Failed to remove subscription");
    }
  };

  if (isLoadingTopic) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Topic not found</h1>
          <p className="text-muted-foreground">
            The topic you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TopicHeader
        topic={topic}
        wsSlug={wsSlug}
        copiedId={copiedId}
        onCopyId={handleCopyId}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setShowDeleteDialog(true)}
        onActivate={handleActivate}
        isActivating={activateTopic.isPending}
      />

      <TopicStatsCards stats={stats} isLoading={isLoadingStats} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <motion.div variants={itemVariants}>
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
            </TabsList>
          </motion.div>

          <TabsContent value="overview" className="space-y-6">
            <motion.div variants={itemVariants}>
              <div className="grid gap-6 lg:grid-cols-2">
                <TopicDetails topic={topic} />
                <SourceDistribution bySource={stats?.by_source} />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <motion.div variants={itemVariants}>
              <SubscriptionList
                subscriptions={subscriptions}
                isLoading={isLoadingSubscriptions}
                onRemove={handleRemoveSubscription}
                isRemoving={removeSubscription.isPending}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <EditTopicDialog
        topic={topic}
        open={isEditing}
        onOpenChange={setIsEditing}
        onSubmit={handleSave}
        isPending={updateTopic.isPending}
      />

      <DeleteTopicDialog
        topic={topic}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        isPending={deleteTopic.isPending}
      />
    </div>
  );
}
