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
import { SpinnerIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { GlassInputWrapper } from "@/components/ui/glass-input";

interface CreateTopicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    slug: string;
    description?: string;
  }) => Promise<void>;
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

export function CreateTopicModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateTopicModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const resetForm = useCallback(() => {
    setName("");
    setSlug("");
    setDescription("");
    setSlugManuallyEdited(false);
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }, [onOpenChange, resetForm]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    await onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
    });

    resetForm();
  };

  const isValid = name.trim().length > 0 && slug.trim().length > 0;
  const slugIsValid = /^[a-z0-9-]+$/.test(slug) && slug.length > 0;

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
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Create Topic
              </DialogTitle>
              <p className="text-muted-foreground">
                Organize your notification subscribers into groups
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <motion.div variants={itemVariants} className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">
                Topic Name <span className="text-destructive">*</span>
              </Label>
              <GlassInputWrapper>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Marketing Newsletter"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  disabled={isPending}
                />
              </GlassInputWrapper>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="slug" className="text-sm font-medium">
                  Topic Slug <span className="text-destructive">*</span>
                </Label>
                {slugManuallyEdited && (
                  <Badge variant="secondary" className="text-[10px] px-2 h-5 font-medium">
                    Custom
                  </Badge>
                )}
              </div>
              <GlassInputWrapper error={slug.length > 0 && !slugIsValid}>
                <div className="relative">
                  <input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="e.g., marketing-newsletter"
                    pattern="[a-z0-9-]+"
                    className={cn(
                      "w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50",
                      slug.length > 0 && !slugIsValid && "text-destructive placeholder:text-destructive/50"
                    )}
                    disabled={isPending}
                  />
                  {slug.length > 0 && !slugIsValid && (
                    <WarningCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                  )}
                </div>
              </GlassInputWrapper>
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier (lowercase letters, numbers, hyphens)
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this topic about?"
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
                  disabled={!isValid || !slugIsValid || isPending}
                  className="h-12 rounded-2xl px-6 min-w-[140px] shadow-lg shadow-primary/20"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Topic"
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
