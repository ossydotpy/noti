import * as React from "react";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/react-router";
import {
    KeyIcon,
    SquaresFourIcon,
    PlugsConnectedIcon,
    GearIcon,
    UsersIcon,
    UsersThreeIcon,
    TagIcon,
    FileTextIcon,
    PaperPlaneTiltIcon,
    SignOutIcon,
} from "@phosphor-icons/react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { getDashboardBasePath } from "@/lib/routes";
import type { Workspace } from "@/lib/types";

const data = {
    navMain: [
        { title: "Overview", path: "", to: "/$wsSlug/dashboard", icon: SquaresFourIcon },
        { title: "Send notification", path: "/send", to: "/$wsSlug/send", icon: PaperPlaneTiltIcon },
        { title: "Providers", path: "/providers", to: "/$wsSlug/providers", icon: PlugsConnectedIcon },
        { title: "Topics", path: "/topics", to: "/$wsSlug/topics", icon: TagIcon },
        { title: "Templates", path: "/templates", to: "/$wsSlug/templates", icon: FileTextIcon },
        { title: "Subscribers", path: "/subscribers", to: "/$wsSlug/subscribers", icon: UsersIcon },
        { title: "API Keys", path: "/api-keys", to: "/$wsSlug/api-keys", icon: KeyIcon },
    ] as const,
    secondary: [
        { title: "Settings", path: "/settings", to: "/$wsSlug/settings", icon: GearIcon },
        { title: "Team Management", path: "/team/members", to: "/$wsSlug/team/members", icon: UsersThreeIcon },
    ] as const,
};

export function DashboardSidebar({
    initialWorkspaces,
    activeWorkspace: initialActiveWorkspace,
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    initialWorkspaces?: Workspace[];
    activeWorkspace?: Workspace | null;
}) {
    const pathname = useLocation().pathname;
    const navigate = useNavigate();
    const params = useParams({ strict: false }) as { wsSlug?: string } | undefined;
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const wsSlug = typeof params?.wsSlug === "string" ? params?.wsSlug : null;
    const dashboardBasePath = getDashboardBasePath(wsSlug);

    const handleLogout = async () => {
        await auth.signOut();
        navigate({ to: "/" });
    };

    return (
        <Sidebar collapsible="icon" className="border-r-0 bg-transparent" {...props}>
            <SidebarHeader className="h-16 flex flex-col justify-center px-3 bg-background border-b border-border/50">
                <WorkspaceSwitcher
                    initialWorkspaces={initialWorkspaces}
                    initialActiveWorkspace={initialActiveWorkspace}
                />
            </SidebarHeader>

            <SidebarContent className="bg-background px-3 py-4 overflow-y-auto overflow-x-hidden min-h-0">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-3 text-xs text-muted-foreground/70 mb-2">
                        {!isCollapsed && "Analytics & Management"}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {data.navMain.map((item) => {
                            const itemUrl = item.path === ""
                                ? dashboardBasePath
                                : `/${wsSlug}${item.path}`;
                            const isActive = item.path === ""
                                ? pathname === dashboardBasePath
                                : pathname.startsWith(itemUrl + "/") || pathname === itemUrl;

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        asChild
                                        isActive={isActive}
                                        className="h-9 px-3 rounded-md hover:bg-muted/50 data-[active=true]:bg-accent"
                                    >
                                        <Link to={item.to} params={{ wsSlug: wsSlug ?? "" }} className="flex items-center gap-2.5">
                                            <item.icon
                                                weight={isActive ? "fill" : "regular"}
                                                className={`size-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                            />
                                            {!isCollapsed && (
                                                <span className={`text-[13px] ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                                                    {item.title}
                                                </span>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>

                <div className="mt-4">
                    <SidebarGroup>
                        <SidebarGroupLabel className="px-3 text-xs text-muted-foreground/70 mb-2">
                            {!isCollapsed && "Configuration"}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {data.secondary.map((item) => {
                                const itemUrl = `/${wsSlug}${item.path}`;
                                const isActive = pathname.startsWith(itemUrl + "/") || pathname === itemUrl;

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className="h-9 px-3 rounded-md hover:bg-muted/50 data-[active=true]:bg-accent"
                                        >
                                            <Link to={item.to} params={{ wsSlug: wsSlug ?? "" }} className="flex items-center gap-2.5">
                                                <item.icon
                                                    weight={isActive ? "fill" : "regular"}
                                                    className={`size-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                                />
                                                {!isCollapsed && (
                                                    <span className={`text-[13px] ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                                                        {item.title}
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t border-border/50 bg-background p-2">
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={handleLogout}
                            className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                            title="Sign out"
                        >
                            <SignOutIcon className="size-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 p-2 rounded-md text-muted-foreground hover:text-foreground"
                    >
                        <SignOutIcon className="size-4 shrink-0" />
                        <span className="text-[13px]">Sign out</span>
                    </button>
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
