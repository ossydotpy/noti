import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import { useCreateTemplate, type TemplateChannel, type TemplateContent } from "@/hooks/use-templates";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SpinnerIcon, ArrowLeft, Bell, DeviceMobile, FileText, Eye, Info } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariablePreview } from "@/components/templates/variable-preview";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

export const Route = createFileRoute("/_authenticated/$wsSlug/templates/new")({
  component: CreateTemplatePage,
});

function CreateTemplatePage() {
  const { wsSlug } = Route.useParams();
  const navigate = useNavigate();

  const createTemplate = useCreateTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<TemplateChannel>("push");
  const [content, setContent] = useState<TemplateContent>({
    title: "",
    body: "",
  });
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<"string" | "number" | "boolean">("string");

  const isPush = channel === "push";
  const isValid = name.trim() && content.body.trim();

  const handleChannelChange = (newChannel: TemplateChannel) => {
    setChannel(newChannel);
    // Reset content when switching to SMS/Any (remove push-specific fields)
    if (newChannel === "sms" || newChannel === "*") {
      setContent({
        body: content.body || "",
      });
    } else {
      setContent({
        title: content.title || "",
        body: content.body || "",
      });
    }
  };

  const handleAddVariable = () => {
    if (!newVarName.trim()) return;
    setVariables({
      ...variables,
      [newVarName.trim()]: newVarType,
    });
    setNewVarName("");
  };

  const handleRemoveVariable = (key: string) => {
    const { [key]: _, ...rest } = variables;
    setVariables(rest);
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        channel,
        content,
        variables,
      });
      toast.success("Template created successfully");
      navigate({ to: "/$wsSlug/templates", params: { wsSlug } });
    } catch {
      toast.error("Failed to create template");
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-8rem)]"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Template</h1>
          <p className="text-muted-foreground">
            Design a reusable message template with dynamic variables
          </p>
        </div>
      </motion.div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-5">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <GlassInputWrapper>
                <input
                  placeholder="e.g., Welcome Message"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <GlassInputWrapper>
                <textarea
                  placeholder="Brief description of this template..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50 resize-none"
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Channel</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleChannelChange("push")}
                  className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all ${
                    channel === "push"
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-foreground/5 border-border hover:bg-foreground/10"
                  }`}
                >
                  <Bell className="h-5 w-5" weight={channel === "push" ? "fill" : "regular"} />
                  <span className="text-sm font-medium">Push</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange("sms")}
                  className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all ${
                    channel === "sms"
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-foreground/5 border-border hover:bg-foreground/10"
                  }`}
                >
                  <DeviceMobile className="h-5 w-5" weight={channel === "sms" ? "fill" : "regular"} />
                  <span className="text-sm font-medium">SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange("*")}
                  className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all ${
                    channel === "*"
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-foreground/5 border-border hover:bg-foreground/10"
                  }`}
                >
                  <FileText className="h-5 w-5" weight={channel === "*" ? "fill" : "regular"} />
                  <span className="text-sm font-medium">Any</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-5">
            <h2 className="text-lg font-semibold">Content</h2>

            {isPush && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Title</Label>
                <GlassInputWrapper>
                  <input
                    placeholder="Notification title..."
                    value={content.title || ""}
                    onChange={(e) => setContent({ ...content, title: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </GlassInputWrapper>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Body <span className="text-destructive">*</span>
              </Label>
              <GlassInputWrapper>
                <textarea
                  placeholder="Enter message content..."
                  value={content.body || ""}
                  onChange={(e) => setContent({ ...content, body: e.target.value })}
                  rows={5}
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50 resize-none"
                />
              </GlassInputWrapper>
              <p className="text-xs text-muted-foreground">
                Use {"{{variable_name}}"} for dynamic values
              </p>
            </div>

            {isPush && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Image URL (Optional)</Label>
                <GlassInputWrapper>
                  <input
                    placeholder="https://example.com/image.png"
                    value={content.image_url || ""}
                    onChange={(e) => setContent({ ...content, image_url: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </GlassInputWrapper>
              </div>
            )}
          </div>

          {/* Reserved Variables Guidelines */}
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

              {Object.keys(variables).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Custom Variables</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pass these when sending notifications via API.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(variables).map(([key, type]) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="rounded-lg gap-1.5"
                      >
                        <code className="font-mono text-xs">{key}</code>
                        <span className="text-[10px] text-muted-foreground">({type as string})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 space-y-5">
            <h2 className="text-lg font-semibold">Variables</h2>

            {Object.keys(variables).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(variables).map(([key, type]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="gap-1.5 pr-1.5 text-xs py-1.5 rounded-lg"
                  >
                    <code className="font-mono">{`{{${key}}}`}</code>
                    <span className="text-muted-foreground">({type as string})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(key)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <GlassInputWrapper>
                  <input
                    placeholder="Variable name..."
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVariable())}
                    className="w-full bg-transparent text-sm px-4 py-3 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </GlassInputWrapper>
              </div>
              <Select value={newVarType} onValueChange={(v) => setNewVarType(v as typeof newVarType)}>
                <SelectTrigger className="h-11 w-[110px] rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddVariable}
                disabled={!newVarName.trim()}
                className="h-11 px-4 rounded-2xl"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              asChild
              className="h-12 rounded-2xl px-6 flex-1"
            >
              <Link to="/$wsSlug/templates" params={{ wsSlug }}>Cancel</Link>
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || createTemplate.isPending}
              className="h-12 rounded-2xl px-6 flex-1 shadow-lg shadow-primary/20"
            >
              {createTemplate.isPending ? (
                <span className="flex items-center gap-2">
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </motion.div>

        {/* Right: Preview */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Live Preview</h2>
            </div>

            <VariablePreview
              content={content}
              channel={channel}
              variables={variables}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
