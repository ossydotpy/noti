import { format, formatDistanceToNow } from "date-fns";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import type { Topic } from "@/hooks/use-topics";

interface TopicDetailsProps {
  topic: Topic;
}

export function TopicDetails({ topic }: TopicDetailsProps) {
  return (
    <InfoCard>
      <InfoCardHeader>Topic Details</InfoCardHeader>
      <InfoCardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Created
            </p>
            <p className="text-sm font-medium">
              {format(new Date(topic.created_at), "MMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Updated
            </p>
            <p className="text-sm font-medium">
              {format(new Date(topic.updated_at), "MMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(topic.updated_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </InfoCardContent>
    </InfoCard>
  );
}
