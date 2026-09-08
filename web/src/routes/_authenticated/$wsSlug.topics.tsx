import { useState } from "react";
import { Outlet, createFileRoute, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import {
  useTopics,
  useCreateTopic,
  useDeleteTopic,
  useActivateTopic,
  type Topic,
} from "@/hooks/use-topics";
import { Button } from "@/components/ui/button";
import { TopicCard } from "@/components/topics/topic-card";
import { TopicCardSkeleton } from "@/components/topics/topic-card-skeleton";
import { CreateTopicModal } from "@/components/topics/create-topic-modal";
import { DeleteTopicDialog } from "@/components/topics/delete-topic-dialog";
import { EmptyState } from "@/components/topics/empty-state";
import { PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
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

export const Route = createFileRoute("/_authenticated/$wsSlug/topics")({
  component: TopicsPage,
});

function TopicsPage() {
  const { wsSlug } = Route.useParams();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const { data: topics, isLoading } = useTopics();
  const createTopic = useCreateTopic();
  const deleteTopic = useDeleteTopic();
  const activateTopic = useActivateTopic();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  if (matchRoute({ to: "/$wsSlug/topics/$topicId", params: { wsSlug, topicId: "" }, fuzzy: false })) {
    return <Outlet />;
  }

  const filteredTopics = topics?.filter(
    (topic) =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false)
  );

  const activeTopics = filteredTopics?.filter((t) => t.is_active) || [];
  const inactiveTopics = filteredTopics?.filter((t) => !t.is_active) || [];

  const handleCreateSubmit = async (data: {
    name: string;
    slug: string;
    description?: string;
  }) => {
    try {
      const topic = await createTopic.mutateAsync(data);
      toast.success("Topic created successfully");
      setShowCreateModal(false);
      navigate({
        to: "/$wsSlug/topics/$topicId",
        params: { wsSlug, topicId: topic.id },
      });
    } catch {
      toast.error("Failed to create topic");
    }
  };

  const handleDelete = async () => {
    if (!topicToDelete) return;

    try {
      await deleteTopic.mutateAsync(topicToDelete.id);
      toast.success("Topic deleted successfully");
      setTopicToDelete(null);
    } catch {
      toast.error("Failed to delete topic");
    }
  };

  const handleActivate = async (topicId: string) => {
    try {
      await activateTopic.mutateAsync(topicId);
      toast.success("Topic activated successfully");
    } catch {
      toast.error("Failed to activate topic");
    }
  };

  const totalSubscribers =
    topics?.reduce((acc, topic) => acc + topic.subscriber_count, 0) || 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats & Action Card */}
      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Stats */}
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Topics
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {topics?.length || 0}
              </p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{activeTopics.length}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Inactive
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{inactiveTopics.length}</p>
              </div>
            </div>
            <div className="h-12 w-px bg-border hidden sm:block" />
            <div className="space-y-1 hidden sm:block">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Subscribers
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {totalSubscribers.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20 shrink-0"
          >
            <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
            New Topic
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="max-w-md">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <input
            type="text"
            placeholder="Search topics by name, slug, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-12 pl-12 pr-4 rounded-2xl",
              "bg-foreground/5 border border-border",
              "text-sm placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-primary/50 focus:bg-primary/5",
              "transition-colors"
            )}
          />
          {searchQuery && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              {filteredTopics?.length || 0}
            </span>
          )}
        </div>
      </motion.div>

      {/* Topics Grid */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TopicCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : filteredTopics?.length === 0 ? (
          searchQuery ? (
            <EmptyState
              type="no-results"
              searchQuery={searchQuery}
              onCreateClick={() => setShowCreateModal(true)}
              onClearSearch={() => setSearchQuery("")}
            />
          ) : (
            <EmptyState
              type="no-topics"
              onCreateClick={() => setShowCreateModal(true)}
            />
          )
        ) : (
          <div className="space-y-8">
            {/* Active Topics */}
            {activeTopics.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold">
                    Active Topics
                  </h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {activeTopics.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeTopics.map((topic, index) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      wsSlug={wsSlug}
                      onActivate={handleActivate}
                      onDelete={setTopicToDelete}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Inactive Topics */}
            {inactiveTopics.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Inactive Topics
                  </h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {inactiveTopics.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {inactiveTopics.map((topic, index) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      wsSlug={wsSlug}
                      onActivate={handleActivate}
                      onDelete={setTopicToDelete}
                      index={index + activeTopics.length}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateTopicModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateSubmit}
        isPending={createTopic.isPending}
      />

      <DeleteTopicDialog
        topic={topicToDelete}
        open={!!topicToDelete}
        onOpenChange={() => setTopicToDelete(null)}
        onConfirm={handleDelete}
        isPending={deleteTopic.isPending}
      />
    </motion.div>
  );
}
