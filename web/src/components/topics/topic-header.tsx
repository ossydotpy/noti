import { motion, type Variants } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import type { Topic } from "@/hooks/use-topics";
import { cn } from "@/lib/utils";

interface TopicHeaderProps {
  topic: Topic;
  wsSlug: string;
  copiedId: boolean;
  onCopyId: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onActivate?: () => void;
  isActivating?: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export function TopicHeader({
  topic,
  wsSlug,
  copiedId,
  onCopyId,
  onEdit,
  onDelete,
  onActivate,
  isActivating,
}: TopicHeaderProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Back Link */}
      <motion.div variants={itemVariants}>
        <Link to={`/${wsSlug}/topics`}>
          <Button 
            variant="ghost" 
            className="-ml-2 px-2 h-10 text-muted-foreground hover:text-foreground"
          >
            ← Back to Topics
          </Button>
        </Link>
      </motion.div>

      {/* Main Header */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6"
      >
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
          
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full text-[10px] px-2.5 py-0.5 font-medium",
                topic.is_active
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
              )}
            >
              {topic.is_active ? "Active" : "Inactive"}
            </Badge>
            
            <div className="flex items-center gap-2">
              <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded-lg">
                {topic.slug}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onCopyId}
              >
                {copiedId ? (
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {topic.description && (
            <p className="text-muted-foreground max-w-xl">
              {topic.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {!topic.is_active && onActivate && (
            <Button
              variant="outline"
              onClick={onActivate}
              disabled={isActivating}
              className="h-11 rounded-2xl px-5"
            >
              Activate
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onEdit}
            className="h-11 rounded-2xl px-5"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="h-11 rounded-2xl px-5"
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
