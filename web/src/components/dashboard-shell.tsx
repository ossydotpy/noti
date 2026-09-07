import { ReactNode } from "react";
import { ThemeProvider } from "@/hooks/use-theme";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { WorkspaceGuard } from "@/components/workspace-guard";
import type { Workspace } from "@/lib/types";

export function DashboardShell({
    children,
    initialWorkspaces,
    activeWorkspace,
}: {
    children: ReactNode;
    initialWorkspaces?: Workspace[];
    activeWorkspace?: Workspace | null;
}) {
    return (
        <ThemeProvider>
            <SidebarProvider>
                <div className="flex h-screen w-full overflow-hidden overflow-x-hidden bg-background text-foreground">
                    <DashboardSidebar
                        initialWorkspaces={initialWorkspaces}
                        activeWorkspace={activeWorkspace}
                    />

                    <SidebarInset className="flex flex-col flex-1 min-w-0">
                        <DashboardHeader />

                        <main className="flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="min-h-full w-full px-10 py-6">
                                <WorkspaceGuard>{children}</WorkspaceGuard>
                            </div>
                        </main>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ThemeProvider>
    );
}
