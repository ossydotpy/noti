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
import { RoleSelect } from "./role-select";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { Spinner, DotsThreeVertical } from "@phosphor-icons/react";
import type { TeamMember, MemberRole } from "@/hooks/use-team";
import { formatDistanceToNow } from "date-fns";

interface MemberListProps {
    members: TeamMember[];
    currentUserId?: string;
    currentUserRole?: MemberRole;
    isLoading: boolean;
    onRoleChange: (memberId: string, role: MemberRole) => void;
    onRemove: (memberId: string) => void;
}

function getRoleBadge(role: MemberRole) {
    const variants: Record<MemberRole, string> = {
        owner: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        member: "bg-green-500/10 text-green-600 border-green-500/20",
        viewer: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    };
    return (
        <Badge variant="outline" className={variants[role]}>
            {role}
        </Badge>
    );
}

export function MemberList({
    members,
    currentUserId,
    currentUserRole,
    isLoading,
    onRoleChange,
    onRemove,
}: MemberListProps) {
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

    const handleRemove = async (memberId: string) => {
        setRemovingId(memberId);
        await onRemove(memberId);
        setRemovingId(null);
    };

    const handleRoleChange = async (memberId: string, role: MemberRole) => {
        setRoleChangingId(memberId);
        await onRoleChange(memberId, role);
        setRoleChangingId(null);
    };

    const isOwner = currentUserRole === "owner";
    const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

    const columns = useMemo<ColumnDef<TeamMember>[]>(
        () => [
            {
                accessorKey: "email",
                header: "Member",
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{row.original.email}</span>
                        <span className="text-xs text-muted-foreground">
                            {row.original.user_id === currentUserId ? "You" : "Member"}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "role",
                header: "Role",
                cell: ({ row }) => {
                    const member = row.original;
                    const isSelf = member.user_id === currentUserId;
                    const isChanging = roleChangingId === member.id;

                    if (isSelf) {
                        return getRoleBadge(member.role);
                    }

                    if (!isOwner) {
                        return getRoleBadge(member.role);
                    }

                    return (
                        <div className="flex items-center gap-2">
                            {isChanging ? (
                                <Spinner className="size-4 animate-spin" />
                            ) : (
                                <RoleSelect
                                    value={member.role}
                                    onValueChange={(role) => handleRoleChange(member.id, role)}
                                    disabled={!isOwner || member.role === "owner"}
                                />
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "created_at",
                header: "Joined",
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
                    const member = row.original;
                    const isSelf = member.user_id === currentUserId;
                    const isRemoving = removingId === member.id;

                    const canRemove = isAdmin && !isSelf && member.role !== "owner";

                    return (
                        <div className="flex justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={isRemoving}
                                    >
                                        {isRemoving ? (
                                            <Spinner className="size-4 animate-spin" />
                                        ) : (
                                            <DotsThreeVertical className="size-4" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {canRemove ? (
                                        <DropdownMenuItem
                                            onClick={() => handleRemove(member.id)}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            Remove member
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
        [currentUserId, currentUserRole, isOwner, isAdmin, removingId, roleChangingId]
    );

    return (
        <DataTable
            columns={columns}
            data={members}
            isLoading={isLoading}
            emptyTitle="No team members"
            emptyDescription="Team members will appear here once they join."
        />
    );
}
