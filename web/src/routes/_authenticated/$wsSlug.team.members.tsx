import { useState } from "react";
import {
    useTeamMembers,
    useTeamMemberMe,
    useUpdateMemberRole,
    useRemoveMember,
    type MemberRole,
} from "@/hooks/use-team";
import { useAuth } from "@/lib/auth";
import { MemberList } from "@/components/team/member-list";
import { RemoveMemberDialog } from "@/components/team/remove-member-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$wsSlug/team/members")({
    component: TeamMembersPage,
});

function TeamMembersPage() {
    const { user } = useAuth();
    const { data: members, isLoading: isLoadingMembers } = useTeamMembers();
    const { data: currentMember, isLoading: isLoadingMe } = useTeamMemberMe();
    const updateRole = useUpdateMemberRole();
    const removeMember = useRemoveMember();

    const [removingMember, setRemovingMember] = useState<{ id: string; email: string } | null>(null);

    const currentUserId = user?.id;
    const currentUserRole = currentMember?.role as MemberRole | undefined;
    const isLoading = isLoadingMembers || isLoadingMe;

    const handleRoleChange = async (memberId: string, role: MemberRole) => {
        await updateRole.mutateAsync({ memberId, role });
    };

    const handleRemove = async () => {
        if (removingMember) {
            await removeMember.mutateAsync(removingMember.id);
            setRemovingMember(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                    Team Members
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage who has access to this workspace.
                </p>
            </header>

            <MemberList
                members={members || []}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                isLoading={isLoading}
                onRoleChange={handleRoleChange}
                onRemove={(id) => {
                    const member = members?.find((m) => m.id === id);
                    if (member) {
                        setRemovingMember({ id, email: member.email });
                    }
                }}
            />

            <RemoveMemberDialog
                open={!!removingMember}
                onOpenChange={(open) => !open && setRemovingMember(null)}
                onConfirm={handleRemove}
                memberEmail={removingMember?.email || ""}
                isPending={removeMember.isPending}
            />
        </div>
    );
}
