
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { PlusIcon, MagnifyingGlassIcon, UsersIcon } from "@phosphor-icons/react";

interface SubscriberEmptyStateProps {
  type: "no-subscribers" | "no-results";
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateClick?: () => void;
}

export function SubscriberEmptyState({
  type,
  searchQuery,
  onClearSearch,
  onCreateClick,
}: SubscriberEmptyStateProps) {
  if (type === "no-results") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 mb-6">
          <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-2">No subscribers found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          No subscribers match your search for &quot;{searchQuery}&quot;. Try
          adjusting your search terms.
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
        <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2">No subscribers yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Subscribers will appear here once they subscribe to your topics or are
        added via API.
      </p>
      {onCreateClick && (
        <Button 
          onClick={onCreateClick}
          className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20"
        >
          <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
          Create Subscriber
        </Button>
      )}
    </motion.div>
  );
}
