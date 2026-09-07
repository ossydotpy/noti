import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@phosphor-icons/react";
import type { Topic } from "@/hooks/use-topics";

interface DeleteTopicDialogProps {
  topic: Topic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteTopicDialog({
  topic,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteTopicDialogProps) {
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
                Delete Topic
              </DialogTitle>
              <p className="text-muted-foreground">
                This action cannot be undone
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Topic to delete
              </p>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{topic?.name}</p>
                <code className="text-sm font-mono text-muted-foreground">{topic?.slug}</code>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-muted-foreground leading-relaxed">
                Deleting this topic will:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Mark the topic as <span className="font-medium text-foreground">inactive</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Stop sending notifications to all subscribers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive font-medium">•</span>
                  <span>Preserve all subscription data (can be restored later)</span>
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
                  "Delete Topic"
                )}
              </Button>
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
