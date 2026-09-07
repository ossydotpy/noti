import { useState, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { SubscriberEmptyState } from "./subscriber-empty-state";
import { Subscriber, useSubscribers } from "@/hooks/use-subscribers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CreateSubscriberModal } from "./create-subscriber-modal";
import { useCreateSubscriber, CreateSubscriberInput } from "@/hooks/use-subscribers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
};

export function SubscriberList() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { wsSlug?: string };
  const wsSlug = params?.wsSlug;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const createSubscriber = useCreateSubscriber();

  const filters = useMemo(() => {
    const filterParams: Parameters<typeof useSubscribers>[0] = {};
    if (searchQuery) {
      filterParams.search = searchQuery;
    }
    if (statusFilter !== "all") {
      filterParams.is_active = statusFilter === "active";
    }
    return filterParams;
  }, [searchQuery, statusFilter]);

  const { data: subscribers, isLoading } = useSubscribers(filters);

  const handleRowClick = (subscriber: Subscriber) => {
    navigate({ to: `/${wsSlug}/subscribers/${subscriber.id}` });
  };

  const handleCreateSubmit = async (data: CreateSubscriberInput) => {
    try {
      const subscriber = await createSubscriber.mutateAsync(data);
      toast.success("Subscriber created successfully");
      setShowCreateModal(false);
      navigate({ to: `/${wsSlug}/subscribers/${subscriber.id}` });
    } catch {
      toast.error("Failed to create subscriber");
    }
  };

  const activeCount = subscribers?.filter((s) => s.is_active).length || 0;
  const inactiveCount = (subscribers?.length || 0) - activeCount;
  const totalCount = subscribers?.length || 0;

  const hasNoSubscribers = !isLoading && subscribers?.length === 0 && !searchQuery;
  const hasNoResults = !isLoading && subscribers?.length === 0 && (searchQuery || statusFilter !== "all");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <CreateSubscriberModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateSubmit}
        isPending={createSubscriber.isPending}
      />

      {/* Stats & Action Bar */}
      <motion.div 
        variants={itemVariants}
        className="rounded-3xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Stats */}
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Subscribers
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {totalCount}
              </p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{activeCount}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Inactive
                  </span>
                </div>
                <p className="text-xl font-semibold tabular-nums">{inactiveCount}</p>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20 shrink-0"
          >
            <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
            Create Subscriber
          </Button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row gap-4"
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or external ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-12 pl-12 pr-4 rounded-2xl",
              "bg-foreground/5 border border-border",
              "text-sm placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-primary/50 focus:bg-primary/5",
              "transition-colors"
            )}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger 
            className={cn(
              "w-[180px] h-12 rounded-2xl",
              "bg-foreground/5 border-border",
              "focus:bg-background focus:ring-2 focus:ring-primary/20"
            )}
          >
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        {hasNoSubscribers ? (
          <SubscriberEmptyState
            type="no-subscribers"
            onCreateClick={() => setShowCreateModal(true)}
          />
        ) : hasNoResults ? (
          <SubscriberEmptyState
            type="no-results"
            searchQuery={searchQuery}
            onClearSearch={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={subscribers || []}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
