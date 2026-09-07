import * as React from "react";
import { Outlet, createFileRoute, useRouter } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { getWorkspaceDashboardPath } from "@/lib/routes";

export const Route = createFileRoute("/_authenticated/$wsSlug")({
  component: WorkspaceLayoutRoute,
});

function WorkspaceLayoutRoute() {
  const { workspaces, activeWorkspace, isPending, isSuccess } = useWorkspaces();
  const router = useRouter();
  const pathname = router.latestLocation.pathname;

  React.useEffect(() => {
    // Wait until the workspaces query has settled successfully and the slug
    // failed to resolve; never redirect on query errors (the WorkspaceGuard
    // error boundary handles those).
    if (!isSuccess || isPending || activeWorkspace) return;
    if (workspaces.length === 0) {
      router.history.replace("/onboarding");
      return;
    }
    const first = workspaces[0];
    router.history.replace(getWorkspaceDashboardPath(first.slug, pathname));
  }, [activeWorkspace, isPending, isSuccess, pathname, router, workspaces]);

  return (
    <DashboardShell
      initialWorkspaces={workspaces}
      activeWorkspace={activeWorkspace}
    >
      <Outlet />
    </DashboardShell>
  );
}
