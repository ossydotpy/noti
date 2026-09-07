import {
    useTeamInvites,
    useInviteMember,
    useRevokeInvite,
} from "@/hooks/use-team";
import { InviteList } from "@/components/team/invite-list";
import { InviteForm } from "@/components/team/invite-form";
import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$wsSlug/team/invites")({
    component: TeamInvitesPage,
});

function TeamInvitesPage() {
    const { data: invites, isLoading: isLoadingInvites } = useTeamInvites();
    const inviteMember = useInviteMember();
    const revokeInvite = useRevokeInvite();

    const handleInvite = async (data: { email: string; role: string }) => {
        await inviteMember.mutateAsync({
            email: data.email,
            role: data.role as "admin" | "member" | "viewer",
        });
    };

    const handleRevoke = async (inviteId: string) => {
        await revokeInvite.mutateAsync(inviteId);
    };

    if (isLoadingInvites) {
        return (
            <div className="space-y-6">
                <div className="space-y-1">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="space-y-3">
                    {[1, 2].map((i) => (
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
                    Invitations
                </h1>
                <p className="text-sm text-muted-foreground">
                    Invite new team members to collaborate on this workspace.
                </p>
            </header>

            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b">
                    <h2 className="font-medium">Send Invitation</h2>
                </div>
                <div className="p-6">
                    <InviteForm
                        onSubmit={handleInvite}
                        isPending={inviteMember.isPending}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="font-medium">Pending Invitations</h2>
                <InviteList
                    invites={invites || []}
                    isLoading={isLoadingInvites}
                    onRevoke={handleRevoke}
                />
            </div>
        </div>
    );
}
