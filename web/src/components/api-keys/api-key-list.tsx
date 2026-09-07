import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner, DotsThreeVertical, Prohibit } from "@phosphor-icons/react";
import type { APIKey } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface ApiKeyListProps {
    apiKeys: APIKey[];
    isLoading: boolean;
    onRevoke: (apiKey: APIKey) => void;
}

function getStatusBadge(status: APIKey["status"]) {
    switch (status) {
        case "active":
            return (
                <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-500/20"
                >
                    Active
                </Badge>
            );
        case "revoked":
            return (
                <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-600 border-red-500/20"
                >
                    Revoked
                </Badge>
            );
        case "expired":
            return (
                <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                    Expired
                </Badge>
            );
    }
}

export function ApiKeyList({ apiKeys, isLoading, onRevoke }: ApiKeyListProps) {
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const handleRevoke = async (apiKey: APIKey) => {
        setRevokingId(apiKey.id);
        onRevoke(apiKey);
        setRevokingId(null);
    };

    const columns = useMemo<ColumnDef<APIKey>[]>(
        () => [
            {
                accessorKey: "name",
                header: "Name",
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">
                            {row.original.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                            {row.original.key_prefix}...
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => getStatusBadge(row.original.status),
            },
            {
                accessorKey: "last_used_at",
                header: "Last Used",
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {row.original.last_used_at
                            ? formatDistanceToNow(row.original.last_used_at)
                            : "Never"}
                    </span>
                ),
            },
            {
                accessorKey: "created_at",
                header: "Created",
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(row.original.created_at)}
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                    const apiKey = row.original;
                    const isRevoking = revokingId === apiKey.id;
                    const canRevoke = apiKey.status === "active";

                    return (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={isRevoking}
                                    >
                                        {isRevoking ? (
                                            <Spinner className="size-4 animate-spin" />
                                        ) : (
                                            <DotsThreeVertical className="size-4" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {canRevoke ? (
                                        <DropdownMenuItem
                                            onClick={() => handleRevoke(apiKey)}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            <Prohibit className="mr-2 size-4" />
                                            Revoke Key
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem disabled>
                                            No actions available
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            },
        ],
        [revokingId]
    );

    return (
        <DataTable
            columns={columns}
            data={apiKeys}
            isLoading={isLoading}
            emptyTitle="No API Keys"
            emptyDescription="You haven't created any API keys yet. Create one to start making authenticated API requests."
        />
    );
}
