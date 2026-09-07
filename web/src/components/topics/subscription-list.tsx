import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import { formatDistanceToNow } from "date-fns";
import type { TopicSubscription } from "@/hooks/use-topics";
import { cn } from "@/lib/utils";
import { TrashIcon } from "@phosphor-icons/react";

interface SubscriptionListProps {
  subscriptions: TopicSubscription[] | undefined;
  isLoading: boolean;
  onRemove: (subscriptionId: string) => void;
  isRemoving: boolean;
}

const sourceColors: Record<string, string> = {
  api: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  webhook: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  manual: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export function SubscriptionList({
  subscriptions,
  isLoading,
  onRemove,
  isRemoving,
}: SubscriptionListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const activeSubscriptions =
    subscriptions?.filter((s) => !s.unsubscribed_at) || [];

  const filteredSubscriptions = activeSubscriptions.filter(
    (sub) =>
      sub.subscriber_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.subscriber_external_id
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <InfoCard>
        <InfoCardHeader>Active Subscriptions</InfoCardHeader>
        <InfoCardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 w-full bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </InfoCardContent>
      </InfoCard>
    );
  }

  if (activeSubscriptions.length === 0) {
    return (
      <InfoCard>
        <InfoCardHeader>Active Subscriptions</InfoCardHeader>
        <InfoCardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <span className="text-2xl text-muted-foreground">👤</span>
            </div>
            <h4 className="text-base font-semibold mb-1">No active subscriptions</h4>
            <p className="text-sm text-muted-foreground">
              This topic doesn&apos;t have any active subscribers yet.
            </p>
          </div>
        </InfoCardContent>
      </InfoCard>
    );
  }

  return (
    <InfoCard>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <InfoCardHeader className="mb-0">Active Subscriptions</InfoCardHeader>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search subscribers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full h-10 pl-4 pr-4 rounded-xl",
                "bg-foreground/5 border border-border",
                "text-sm placeholder:text-muted-foreground/50",
                "focus:outline-none focus:border-primary/50 focus:bg-primary/5",
                "transition-colors"
              )}
            />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            <span className="font-medium text-foreground">
              {filteredSubscriptions.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {activeSubscriptions.length}
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-xs font-semibold h-12 px-4">Subscriber</TableHead>
              <TableHead className="text-xs font-semibold h-12 px-4">External ID</TableHead>
              <TableHead className="text-xs font-semibold h-12 px-4">Source</TableHead>
              <TableHead className="text-xs font-semibold h-12 px-4">Subscribed</TableHead>
              <TableHead className="w-[50px] px-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {filteredSubscriptions.map((subscription, index) => (
                <motion.tr
                  key={subscription.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="group border-b border-border/50 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                        {subscription.subscriber_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {subscription.subscriber_name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {subscription.subscriber.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <code className="text-xs bg-muted/50 px-2 py-1 rounded-lg font-mono">
                      {subscription.subscriber_external_id}
                    </code>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize text-[10px] font-medium rounded-full",
                        sourceColors[subscription.source] || ""
                      )}
                    >
                      {subscription.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm py-3 px-4">
                    {formatDistanceToNow(new Date(subscription.subscribed_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemove(subscription.id)}
                      disabled={isRemoving}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {filteredSubscriptions.length === 0 && searchQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-sm text-muted-foreground">
            No subscribers found matching &quot;{searchQuery}&quot;
          </p>
        </motion.div>
      )}
    </InfoCard>
  );
}
