
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Subscriber } from "@/hooks/use-subscribers";
import { formatDistanceToNow } from "date-fns";
import { SubscriberRowActions } from "./subscriber-row-actions";
import { cn } from "@/lib/utils";

export const columns: ColumnDef<Subscriber>[] = [
  {
    accessorKey: "name",
    header: "Subscriber",
    cell: ({ row }) => {
      const subscriber = row.original;
      const displayName = subscriber.first_name || subscriber.last_name
        ? `${subscriber.first_name || ""} ${subscriber.last_name || ""}`.trim()
        : "Unnamed Subscriber";
      
      return (
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-sm">{displayName}</div>
            {subscriber.email && (
              <div className="text-xs text-muted-foreground">{subscriber.email}</div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "external_id",
    header: "External ID",
    cell: ({ row }) => {
      return (
        <code className="text-xs bg-muted/50 px-3 py-1.5 rounded-xl font-mono text-muted-foreground">
          {row.getValue("external_id")}
        </code>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active");
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium px-2.5 py-1 rounded-full",
            isActive
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-slate-500/10 text-slate-600 border-slate-500/20"
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "device_count",
    header: "Devices",
    cell: ({ row }) => {
      const count = row.getValue("device_count") as number;
      return (
        <span className={cn(
          "text-sm font-medium",
          count > 0 ? "text-foreground" : "text-muted-foreground"
        )}>
          {count}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.getValue("created_at")), {
            addSuffix: true,
          })}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <SubscriberRowActions subscriber={row.original} />,
  },
];
