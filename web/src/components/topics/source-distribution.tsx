import { motion } from "motion/react";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import { cn } from "@/lib/utils";

interface SourceDistributionProps {
  bySource: Record<string, number> | undefined;
}

const sourceColors: Record<string, string> = {
  api: "bg-blue-500",
  webhook: "bg-purple-500",
  manual: "bg-amber-500",
};

const sourceLabels: Record<string, string> = {
  api: "API",
  webhook: "Webhook",
  manual: "Manual",
};

export function SourceDistribution({ bySource }: SourceDistributionProps) {
  if (!bySource || Object.keys(bySource).length === 0) {
    return null;
  }

  const total = Object.values(bySource).reduce((acc, count) => acc + count, 0);
  const sortedSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]);

  return (
    <InfoCard>
      <InfoCardHeader>Subscription Sources</InfoCardHeader>
      <InfoCardContent className="space-y-5">
        {/* Progress Bars */}
        <div className="space-y-4">
          {sortedSources.map(([source, count], index) => {
            const percentage = Math.round((count / total) * 100);
            return (
              <motion.div
                key={source}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        sourceColors[source] || "bg-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">
                      {sourceLabels[source] || source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.08 + 0.1,
                      ease: "easeOut",
                    }}
                    className={cn(
                      "h-full rounded-full",
                      sourceColors[source] || "bg-muted-foreground"
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Subscribers</span>
            <span className="text-xl font-bold tabular-nums">{total.toLocaleString()}</span>
          </div>
        </div>
      </InfoCardContent>
    </InfoCard>
  );
}
