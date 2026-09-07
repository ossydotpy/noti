import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner, DotsThreeVertical } from "@phosphor-icons/react";
import type { TeamInvite } from "@/hooks/use-team";
import { formatDistanceToNow } from "date-fns";

interface InviteListProps {
    invites: TeamInvite[];
    isLoading: boolean;
    onRevoke: (inviteId: string) => void;
}

export function InviteList({ invites, isLoading, onRevoke }: InviteListProps) {
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const handleRevoke = async (inviteId: string) => {
        setRevokingId(inviteId);
        await onRevoke(inviteId);
        setRevokingId(null);
    };

    const columns = useMemo<ColumnDef<TeamInvite>[]>(
        () => [
            {
                accessorKey: "email",
                header: "Email",
                cell: ({ row }) => (
                    <span className="font-medium text-sm">{row.original.email}</span>
                ),
            },
            {
                accessorKey: "role",
                header: "Role",
                cell: ({ row }) => (
                    <span className="text-sm capitalize">{row.original.role}</span>
                ),
            },
            {
                accessorKey: "expires_at",
                header: "Expires",
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(row.original.expires_at)} remaining
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                    const invite = row.original;
                    const isRevoking = revokingId === invite.id;

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
                                    <DropdownMenuItem
                                        onClick={() => handleRevoke(invite.id)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        Revoke invite
                                    </DropdownMenuItem>
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
            data={invites}
            isLoading={isLoading}
            emptyTitle="No pending invitations"
            emptyDescription="No invitations have been sent yet."
        />
    );
}
