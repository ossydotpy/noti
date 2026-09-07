import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import {
  useTemplate,
  useTemplateVersions,
  useUpdateTemplate,
  useDeleteTemplate,
  type TemplateChannel,
  type Template,
} from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VariablePreview } from "@/components/templates/variable-preview";
import { EditTemplateModal } from "@/components/templates/edit-template-modal";
import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog";
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Copy,
  Check,
  Bell,
  DeviceMobile,
  FileText,
  Clock,
  GitCommit,
  Info,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { toast } from "sonner";

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

const channelConfig: Record<TemplateChannel, { label: string; icon: typeof Bell; color: string }> = {
  push: {
    label: "Push",
    icon: Bell,
    color: "text-blue-600",
  },
  sms: {
    label: "SMS",
    icon: DeviceMobile,
    color: "text-emerald-600",
  },
  "*": {
    label: "Any",
    icon: FileText,
    color: "text-violet-600",
  },
};

export const Route = createFileRoute("/_authenticated/$wsSlug/templates/$templateId")({
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const { wsSlug, templateId } = Route.useParams();
  const navigate = useNavigate();

  const { data: template, isLoading } = useTemplate(templateId);
  const { data: versions, isLoading: versionsLoading } = useTemplateVersions(template?.name);
  const updateTemplate = useUpdateTemplate(templateId || "");
  const deleteTemplate = useDeleteTemplate();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (templateId) {
      navigator.clipboard.writeText(templateId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success("Template ID copied to clipboard");
    }
  };

  const handleSave = async (data: {
    name?: string;
    description?: string;
    content?: { title?: string; body: string; data_payload?: Record<string, unknown>; image_url?: string };
    variables?: Record<string, unknown>;
  }) => {
    try {
      await updateTemplate.mutateAsync(data);
      toast.success("Template updated successfully");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;

    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success("Template deleted successfully");
      navigate({ to: "/$wsSlug/templates", params: { wsSlug } });
    } catch {
      toast.error("Failed to delete template");
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!template) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <h3 className="text-xl font-bold tracking-tight mb-2">Template not found</h3>
        <p className="text-muted-foreground mb-6">
          The template you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild className="h-12 rounded-2xl px-6">
          <Link to="/$wsSlug/templates" params={{ wsSlug }}>Back to Templates</Link>
        </Button>
      </motion.div>
    );
  }

  const channel = channelConfig[template.channel];
  const ChannelIcon = channel.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-10 w-10 shrink-0 rounded-2xl"
          >
            <Link to="/$wsSlug/templates" params={{ wsSlug }}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {template.name}
              </h1>
              <Badge variant="secondary" className="h-6">v{template.version}</Badge>
              <div className={`inline-flex items-center gap-1.5 text-sm ${channel.color}`}>
                <ChannelIcon className="h-4 w-4" weight="fill" />
                {channel.label}
              </div>
            </div>
            {template.description && (
              <p className="text-muted-foreground mt-1">{template.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyId}
              className="h-10 w-10 rounded-2xl"
            >
              {copiedId ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="h-10 rounded-2xl"
            >
              <PencilSimple className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="h-10 rounded-2xl"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>Created {format(new Date(template.created_at), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitCommit className="h-4 w-4" />
            <span>Version {template.version}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${template.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
            <span className="capitalize">{template.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </motion.div>

      {/* Content - Two Column Layout */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="rounded-xl">
            <TabsTrigger value="content" className="rounded-lg">Content</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-lg">Preview</TabsTrigger>
            <TabsTrigger value="versions" className="rounded-lg">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Left: Template Content */}
              <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-6">
                {template.content.title && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Title</h4>
                    <p className="text-lg font-medium">{template.content.title}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Body</h4>
                  <p className="text-base whitespace-pre-wrap">{template.content.body}</p>
                </div>

                {template.content.image_url && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Image URL</h4>
                    <code className="text-sm bg-muted px-3 py-2 rounded-xl">{template.content.image_url}</code>
                  </div>
                )}

                {template.content.data_payload && Object.keys(template.content.data_payload).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Data Payload</h4>
                    <pre className="text-sm bg-muted p-4 rounded-2xl overflow-x-auto">
                      {JSON.stringify(template.content.data_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right: Available Variables */}
              <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold">Available Variables</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Reserved Subscriber Variables</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      These variables are automatically available from subscriber data. Use them with {"{{subscriber.variable_name}}"} syntax.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-lg gap-1.5">
                        <code className="font-mono text-xs">subscriber.external_id</code>
                        <span className="text-[10px] text-muted-foreground">(string)</span>
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg gap-1.5">
                        <code className="font-mono text-xs">subscriber.first_name</code>
                        <span className="text-[10px] text-muted-foreground">(string)</span>
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg gap-1.5">
                        <code className="font-mono text-xs">subscriber.last_name</code>
                        <span className="text-[10px] text-muted-foreground">(string)</span>
                      </Badge>
                      <Badge variant="secondary" className="rounded-lg gap-1.5">
                        <code className="font-mono text-xs">subscriber.email</code>
                        <span className="text-[10px] text-muted-foreground">(string)</span>
                      </Badge>
                    </div>
                  </div>

                  {Object.keys(template.variables).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Custom Variables</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Pass these when sending notifications via API.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(template.variables).map(([key, type]) => (
                          <Badge key={key} variant="secondary" className="rounded-lg gap-1.5">
                            <code className="font-mono text-xs">{key}</code>
                            <span className="text-[10px] text-muted-foreground">({String(type)})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Left: Content Details */}
              <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Title</h4>
                  <p className="text-lg font-medium">{template.content.title || "(none)"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Body</h4>
                  <p className="text-base whitespace-pre-wrap">{template.content.body}</p>
                </div>

                {template.content.image_url && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Image URL</h4>
                    <code className="text-sm bg-muted px-3 py-2 rounded-xl break-all">{template.content.image_url}</code>
                  </div>
                )}
              </div>

              {/* Right: Preview */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Live Preview</h4>
                <VariablePreview
                  content={template.content}
                  channel={template.channel}
                  variables={template.variables}
                />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {versionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-border">
                      <Skeleton className="h-8 w-12 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48 rounded-lg" />
                        <Skeleton className="h-3 w-32 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : versions && versions.length >= 1 ? (
                versions.map((version: Template) => (
                  <div
                    key={version.id}
                    className={`flex items-center justify-between p-5 rounded-2xl border ${
                      version.id === template.id
                        ? "bg-primary/5 border-primary/20"
                        : "bg-linear-to-br from-background via-background to-muted/20 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        v{version.version}
                      </div>
                      <div>
                        <p className="font-medium">
                          {version.name}
                          {version.id === template.id && (
                            <Badge variant="secondary" className="ml-2 rounded-lg">Current</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${version.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span className="text-sm text-muted-foreground capitalize">
                        {version.is_active ? "Active" : "Archived"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20">
                  <p>No version history available</p>
                  <p className="text-sm">This is the first version of this template</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modals */}
      <EditTemplateModal
        key={template?.id}
        template={template}
        open={isEditing}
        onOpenChange={setIsEditing}
        onSubmit={handleSave}
        isPending={updateTemplate.isPending}
      />

      <DeleteTemplateDialog
        template={template}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        isPending={deleteTemplate.isPending}
      />
    </motion.div>
  );
}
