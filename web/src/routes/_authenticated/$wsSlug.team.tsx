import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTeamMemberMe, type MemberRole } from "@/hooks/use-team";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/$wsSlug/team")({
    component: TeamLayout,
});

function TeamLayout() {
    const { wsSlug } = Route.useParams();
    const navigate = useNavigate();
    const { data: currentMember, isLoading } = useTeamMemberMe();

    const currentRole = currentMember?.role as MemberRole | undefined;
    const canManageTeam = currentRole === "owner" || currentRole === "admin";

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-9 w-48" />
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
            <Tabs
                value={canManageTeam ? undefined : "members"}
                onValueChange={(value) => {
                    if (value === "members") {
                        navigate({ to: "/$wsSlug/team/members", params: { wsSlug } });
                    } else if (value === "invites") {
                        navigate({ to: "/$wsSlug/team/invites", params: { wsSlug } });
                    }
                }}
            >
                <TabsList variant="line">
                    <TabsTrigger value="members" asChild>
                        <Link to="/$wsSlug/team/members" params={{ wsSlug }}>Members</Link>
                    </TabsTrigger>
                    {canManageTeam && (
                        <TabsTrigger value="invites" asChild>
                            <Link to="/$wsSlug/team/invites" params={{ wsSlug }}>Invitations</Link>
                        </TabsTrigger>
                    )}
                </TabsList>
            </Tabs>

            <Outlet />
        </div>
    );
}
