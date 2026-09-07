import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpinnerIcon } from "@phosphor-icons/react";
import type { Template } from "@/hooks/use-templates";

interface DeleteTemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteTemplateDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteTemplateDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-8 pt-8 pb-6 border-b border-border/50">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold tracking-tight text-destructive">
                Delete Template
              </DialogTitle>
              <p className="text-muted-foreground">
                This action will archive the template
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Template to delete
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{template.name}</p>
                  <Badge variant="secondary">v{template.version}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground capitalize">
                    {template.channel === "push" && "Push Notification"}
                    {template.channel === "sms" && "SMS"}
                    {template.channel === "*" && "Any Channel"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground leading-relaxed">
                Deleting this template will:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Archive the template (version {template.version})</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Remove it from the active templates list</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Preserve template history for audit purposes</span>
                </li>
              </ul>
            </div>

            <DialogFooter className="gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="h-12 rounded-2xl px-6"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={isPending}
                className="h-12 rounded-2xl px-6 min-w-[140px]"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete Template"
                )}
              </Button>
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
