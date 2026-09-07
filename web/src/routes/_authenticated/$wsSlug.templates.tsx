import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import {
  useTemplates,
  useDeleteTemplate,
  type Template,
  type TemplateChannel,
} from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateCardSkeleton } from "@/components/templates/template-card-skeleton";
import { EditTemplateModal } from "@/components/templates/edit-template-modal";
import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog";
import { EmptyState } from "@/components/templates/empty-state";
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

type ChannelFilter = "all" | TemplateChannel;

export const Route = createFileRoute("/_authenticated/$wsSlug/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { wsSlug } = Route.useParams();

  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  // Filter templates
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesChannel =
      channelFilter === "all" || template.channel === channelFilter;

    return matchesSearch && matchesChannel;
  });

  // Stats
  const pushTemplates = templates?.filter((t) => t.channel === "push") || [];
  const smsTemplates = templates?.filter((t) => t.channel === "sms") || [];
  const anyTemplates = templates?.filter((t) => t.channel === "*") || [];

  const handleEditSubmit = async (
    templateId: string,
    data: {
      name?: string;
      description?: string;
      content?: { title?: string; body: string; data_payload?: Record<string, unknown>; image_url?: string };
      variables?: Record<string, unknown>;
    }
  ) => {
    toast.success("Template updated");
    setTemplateToEdit(null);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast.success("Template deleted successfully");
      setTemplateToDelete(null);
    } catch {
      toast.error("Failed to delete template");
    }
  };

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
                Total Templates
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {templates?.length || 0}
              </p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Push
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{pushTemplates.length}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    SMS
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{smsTemplates.length}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Any
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{anyTemplates.length}</p>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <Button
            asChild
            className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20 shrink-0"
          >
            <Link to="/$wsSlug/templates/new" params={{ wsSlug }}>
              <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
              New Template
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <input
            type="text"
            placeholder="Search templates by name or description..."
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
              {filteredTemplates?.length || 0}
            </span>
          )}
        </div>

        {/* Channel Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Filter:
          </span>
          <div className="flex gap-1">
            {(["all", "push", "sms", "*"] as ChannelFilter[]).map((channel) => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  channelFilter === channel
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {channel === "*" ? "Any" : channel.charAt(0).toUpperCase() + channel.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Templates Grid */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TemplateCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : filteredTemplates?.length === 0 ? (
          searchQuery || channelFilter !== "all" ? (
            <EmptyState
              type="no-results"
              searchQuery={searchQuery}
              createHref={`/${wsSlug}/templates/new`}
              onClearSearch={() => {
                setSearchQuery("");
                setChannelFilter("all");
              }}
            />
          ) : (
            <EmptyState
              type="no-templates"
              createHref={`/${wsSlug}/templates/new`}
            />
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates?.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                wsSlug={wsSlug}
                onEdit={setTemplateToEdit}
                onDelete={setTemplateToDelete}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <EditTemplateModal
        key={templateToEdit?.id}
        template={templateToEdit}
        open={!!templateToEdit}
        onOpenChange={() => setTemplateToEdit(null)}
        onSubmit={(data) => {
          if (templateToEdit) {
            handleEditSubmit(templateToEdit.id, data);
          }
        }}
        isPending={false}
      />

      <DeleteTemplateDialog
        template={templateToDelete}
        open={!!templateToDelete}
        onOpenChange={() => setTemplateToDelete(null)}
        onConfirm={handleDelete}
        isPending={deleteTemplate.isPending}
      />
    </motion.div>
  );
}
