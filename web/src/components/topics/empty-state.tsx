import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@phosphor-icons/react";

interface EmptyStateProps {
  type: "no-topics" | "no-results";
  searchQuery?: string;
  onCreateClick: () => void;
  onClearSearch?: () => void;
}

export function EmptyState({
  type,
  searchQuery,
  onCreateClick,
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
        <h3 className="text-xl font-bold tracking-tight mb-2">No topics found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          No topics match &quot;<span className="font-medium text-foreground">{searchQuery}</span>&quot;
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
        <span className="text-3xl text-muted-foreground">🔔</span>
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2">No topics yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Topics help you organize subscribers into groups. Create your first topic
        to start sending targeted notifications.
      </p>
      <Button 
        onClick={onCreateClick}
        className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20"
      >
        <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
        Create First Topic
      </Button>
    </motion.div>
  );
}
