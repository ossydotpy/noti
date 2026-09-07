import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PlusIcon, FileTextIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  type: "no-templates" | "no-results";
  searchQuery?: string;
  createHref?: string;
  onClearSearch?: () => void;
}

export function EmptyState({
  type,
  searchQuery,
  createHref,
  onClearSearch,
}: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 mb-6">
          <span className="text-3xl text-muted-foreground">🔍</span>
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-2">No templates found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          No templates match &quot;<span className="font-medium text-foreground">{searchQuery}</span>&quot;
        </p>
        <Button 
          variant="outline" 
          onClick={onClearSearch}
          className="h-12 rounded-2xl px-6"
        >
          Clear Search
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 mb-6">
        <FileTextIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2">No templates yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Templates let you create reusable messages with dynamic variables. 
        Create your first template to streamline your notifications.
      </p>
      {createHref && (
        <Button 
          asChild
          className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20"
        >
          <Link to={createHref}>
            <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
            Create First Template
          </Link>
        </Button>
      )}
    </motion.div>
  );
}
