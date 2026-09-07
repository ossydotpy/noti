import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();

    const firstName = user?.first_name;

    return (
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-6 bg-background">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="flex md:hidden -ml-2" />
                <div className="text-sm font-medium h-5">
                    {firstName ? `Welcome ${firstName}` : ""}
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <a
                    href="/help"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    Help
                </a>
                <a
                    href="/docs"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    Docs
                </a>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={toggleTheme}
                >
                    {theme === "dark" ? (
                        <SunIcon className="h-4 w-4" />
                    ) : (
                        <MoonIcon className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </header>
    );
}
