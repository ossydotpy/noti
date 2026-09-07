import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellIcon, TagIcon } from "@phosphor-icons/react";

interface SubscriberSubscriptionsProps {
  subscriberId: string;
}

export function SubscriberSubscriptions({
  subscriberId,
}: SubscriberSubscriptionsProps) {
  // Placeholder for subscriptions data
  // This would fetch from the backend when the endpoint is available
  const hasSubscriptions = false;

  if (!hasSubscriptions) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <BellIcon className="h-6 w-6 text-muted-foreground" weight="light" />
          </div>
          <h3 className="text-base font-semibold mb-2">No subscriptions</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            This subscriber is not subscribed to any topics yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topic Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Subscription list would go here */}
          <p className="text-sm text-muted-foreground">
            Subscription data will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
