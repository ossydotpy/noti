import { useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SpinnerIcon, Info } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import { TemplateContentEditor } from "./template-content-editor";
import { VariablePreview } from "./variable-preview";
import type { Template, TemplateContent } from "@/hooks/use-templates";

interface EditTemplateModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name?: string;
    description?: string;
    content?: TemplateContent;
    variables?: Record<string, unknown>;
  }) => void;
  isPending: boolean;
}

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
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

export function EditTemplateModal({
  template,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: EditTemplateModalProps) {
  // Initialize directly from template - parent should remount via key when template changes
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [content, setContent] = useState<TemplateContent>(template?.content ?? { body: "" });
  const [variables, setVariables] = useState<Record<string, unknown>>(template?.variables ?? {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Parameters<typeof onSubmit>[0] = {};

    if (name !== template?.name) updates.name = name;
    if (description !== (template?.description || "")) {
      updates.description = description || undefined;
    }
    if (JSON.stringify(content) !== JSON.stringify(template?.content)) {
      updates.content = content;
    }
    if (JSON.stringify(variables) !== JSON.stringify(template?.variables)) {
      updates.variables = variables;
    }

    onSubmit(updates);
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  const isValid = name.trim() && content.body.trim();
  const hasChanges =
    name !== template?.name ||
    description !== (template?.description || "") ||
    JSON.stringify(content) !== JSON.stringify(template?.content) ||
    JSON.stringify(variables) !== JSON.stringify(template?.variables);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl max-h-[90vh] flex flex-col !max-w-[90vw] !w-[90vw]"
        style={{ maxWidth: '90vw', width: '90vw' }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="overflow-y-auto flex-1"
        >
          <div className="px-8 pt-8 pb-6 border-b border-border/50 shrink-0">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Edit Template
                </DialogTitle>
                <Badge variant="secondary" className="h-6">v{template.version}</Badge>
              </div>
              <p className="text-muted-foreground">
                Update this template. Changes will create a new version.
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <motion.div variants={itemVariants}>
              <Alert className="rounded-2xl bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  Editing creates a new version (v{template.version + 1}). The current version will be archived.
                </AlertDescription>
              </Alert>
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
              {/* Left Column: Form */}
              <div className="space-y-6">
                {/* Available Variables Guidelines */}
                <motion.div variants={itemVariants} className="rounded-2xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Available Variables</h3>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Reserved subscriber variables (auto-populated):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="rounded-md gap-1 text-[10px]">
                        <code className="font-mono">subscriber.external_id</code>
                      </Badge>
                      <Badge variant="secondary" className="rounded-md gap-1 text-[10px]">
                        <code className="font-mono">subscriber.first_name</code>
                      </Badge>
                      <Badge variant="secondary" className="rounded-md gap-1 text-[10px]">
                        <code className="font-mono">subscriber.last_name</code>
                      </Badge>
                      <Badge variant="secondary" className="rounded-md gap-1 text-[10px]">
                        <code className="font-mono">subscriber.email</code>
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Basic Info */}
                <motion.div variants={itemVariants} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="edit-name" className="text-sm font-medium">
                      Template Name <span className="text-destructive">*</span>
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="edit-name"
                        placeholder="e.g., Welcome Message"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                        disabled={isPending}
                      />
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="edit-description" className="text-sm font-medium">
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <GlassInputWrapper>
                      <textarea
                        id="edit-description"
                        placeholder="Brief description of this template..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50 resize-none"
                        disabled={isPending}
                      />
                    </GlassInputWrapper>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Channel</Label>
                    <div className="h-12 px-4 rounded-2xl border border-border bg-muted flex items-center text-muted-foreground text-sm">
                      {template.channel === "push" && "Push Notification"}
                      {template.channel === "sms" && "SMS"}
                      {template.channel === "*" && "Any Channel"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Channel cannot be changed after creation
                    </p>
                  </div>
                </motion.div>

                {/* Content Editor */}
                <motion.div variants={itemVariants} className="space-y-4">
                  <h3 className="text-sm font-semibold">Content & Variables</h3>
                  <TemplateContentEditor
                    channel={template.channel}
                    content={content}
                    onChange={setContent}
                    variables={variables}
                    onVariablesChange={setVariables}
                  />
                </motion.div>
              </div>

              {/* Right Column: Preview */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-sm font-semibold">Live Preview</h3>
                <div className="sticky top-0">
                  <VariablePreview
                    content={content}
                    channel={template.channel}
                    variables={variables}
                  />
                </div>
              </motion.div>
            </div>

            {/* Actions */}
            <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-border">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                  className="h-12 rounded-2xl px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || !hasChanges || isPending}
                  className="h-12 rounded-2xl px-6 min-w-[140px] shadow-lg shadow-primary/20"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </motion.div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
