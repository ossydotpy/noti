import { useState, useCallback } from "react";
import { motion, type Variants } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SpinnerIcon } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import type { TopicWithStats } from "@/hooks/use-topics";

interface EditTopicDialogProps {
  topic: TopicWithStats | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
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

export function EditTopicDialog({
  topic,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: EditTopicDialogProps) {
  const [name, setName] = useState(topic?.name || "");
  const [description, setDescription] = useState(topic?.description || "");

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen && topic) {
      setName(topic.name);
      setDescription(topic.description || "");
    }
    onOpenChange(newOpen);
  }, [onOpenChange, topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
    });
  };

  const isValid = name.trim().length > 0;
  const hasChanges =
    name !== topic?.name || description !== (topic?.description || "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="px-8 pt-8 pb-6 border-b border-border/50">
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Edit Topic
                </DialogTitle>
                {hasChanges && (
                  <Badge variant="secondary" className="text-[10px] px-2 h-5">
                    Modified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Update details for <span className="font-medium text-foreground">{topic?.name}</span>
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <motion.div variants={itemVariants} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Topic Slug
              </p>
              <code className="text-sm font-mono text-foreground">{topic?.slug}</code>
              <p className="text-xs text-muted-foreground">
                Cannot be changed after creation
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                Topic Name <span className="text-destructive">*</span>
              </Label>
              <GlassInputWrapper>
                <input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Topic name"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  disabled={isPending}
                />
              </GlassInputWrapper>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Topic description"
                rows={3}
                className="resize-none rounded-2xl border-border bg-foreground/5 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={isPending}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <DialogFooter className="gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
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
              </DialogFooter>
            </motion.div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
