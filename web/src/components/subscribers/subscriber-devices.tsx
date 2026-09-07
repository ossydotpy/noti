import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceMobileIcon } from "@phosphor-icons/react";
import type { Device } from "@/hooks/use-subscribers";
import { formatDistanceToNow } from "date-fns";

interface SubscriberDevicesProps {
  devices: Device[];
}

export function SubscriberDevices({ devices }: SubscriberDevicesProps) {
  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <DeviceMobileIcon
              className="h-6 w-6 text-muted-foreground"
              weight="light"
            />
          </div>
          <h3 className="text-base font-semibold mb-2">No devices</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            This subscriber has not registered any devices yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {devices.map((device) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <DeviceMobileIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium capitalize">
                    {device.platform}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      device.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                    }`}
                  >
                    {device.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {device.push_token}
                </p>
                {device.last_seen && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last seen{" "}
                    {formatDistanceToNow(new Date(device.last_seen), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
