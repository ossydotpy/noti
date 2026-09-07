import * as React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { SignOutIcon, UserIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { auth, useAuth } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/hooks/use-scroll";
import { useTheme } from "@/hooks/use-theme";
import { isDashboardPath } from "@/lib/routes";
import { useWorkspaces } from "@/hooks/use-workspaces";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
    return <NavbarContent />;
}

function DashboardLink({
    className,
    onClick,
    children,
}: {
    className?: string;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    const { workspaces } = useWorkspaces();
    const firstWorkspace = workspaces?.[0];

    if (firstWorkspace) {
        return (
            <Link
                to="/$wsSlug/dashboard"
                params={{ wsSlug: firstWorkspace.slug }}
                className={className}
                onClick={onClick}
            >
                {children}
            </Link>
        );
    }

    return (
        <Link to="/onboarding" className={className} onClick={onClick}>
            {children}
        </Link>
    );
}

function NavbarContent() {
    const { pathname } = useLocation();
    const hideNavbar = isDashboardPath(pathname);

    const [open, setOpen] = React.useState(false);
    const scrolled = useScroll(10);
    const { status, user } = useAuth();
    const session = status === "authenticated" ? user : null;
    const isPending = status === "loading";

    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const links = [
        { label: "Features", href: "/#features" },
        { label: "About", href: "/#about" },
    ];

    const handleLogout = async () => {
        await auth.signOut();
        navigate({ to: "/" });
    };

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (hideNavbar) return null;

    const displayName = user
        ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
        : "";

    return (
        <>
            <motion.header
                initial={false}
                animate={{
                    top: scrolled ? 12 : 8,
                    maxWidth: scrolled ? "800px" : "1024px",
                    borderRadius: scrolled ? "32px" : "16px",
                    x: "-50%",
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    mass: 0.8
                }}
                style={{ left: "50%" }}
                className={cn(
                    "fixed z-50 w-[calc(100%-2rem)] border border-transparent backdrop-blur-lg transition-colors duration-500",
                    {
                        "bg-background/60 border-border shadow-lg": scrolled && !open,
                        "bg-background/90 border-transparent": open,
                        "bg-transparent": !scrolled && !open,
                    }
                )}
            >
                <nav
                    className={cn(
                        "flex h-14 w-full items-center justify-between px-4 md:h-12",
                        {
                            "md:px-2": scrolled,
                        }
                    )}
                >
                    <Link to="/" className="group flex items-center px-2">
                        <span className="text-lg font-bold tracking-tight text-foreground">ZeroSend</span>
                    </Link>

                    <div className="hidden items-center gap-2 md:flex">
                        {!isPending && session ? (
                            <>
                                <DashboardLink
                                    className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
                                >
                                    Dashboard
                                </DashboardLink>
                                <div className="h-4 w-px bg-border mx-1" />
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                                            <Avatar className="h-8 w-8 border shadow-sm">
                                                <AvatarFallback className="bg-muted text-[10px] font-bold">
                                                    {displayName?.charAt(0).toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 mt-2 rounded-2xl p-2" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal px-2 py-1.5">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="my-1" />
                                        <DropdownMenuItem className="rounded-lg cursor-pointer gap-2" asChild>
                                            <DashboardLink className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" />
                                                Dashboard
                                            </DashboardLink>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1" />
                                        <DropdownMenuItem
                                            className="rounded-lg cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={handleLogout}
                                        >
                                            <SignOutIcon className="h-4 w-4" />
                                            Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                {links.map((link, i) => (
                                    <a
                                        key={i}
                                        className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-medium")}
                                        href={link.href}
                                    >
                                        {link.label}
                                    </a>
                                ))}
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
                                {!isPending && (
                                    <>
                                        <Button variant="outline" size="sm" asChild className="rounded-full h-8 px-4">
                                            <Link to="/login">Sign In</Link>
                                        </Button>
                                        <Button size="sm" asChild className="rounded-full h-8 px-4 shadow-sm">
                                            <Link to="/signup">Get Started</Link>
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} className="md:hidden">
                        <MenuToggleIcon open={open} className="size-5" />
                    </Button>
                </nav>
            </motion.header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-40 flex flex-col bg-background/80 backdrop-blur-2xl md:hidden"
                    >
                        <div className="flex flex-col h-full w-full justify-between gap-y-2 p-6 pt-24">
                            <div className="grid gap-y-4">
                                {session ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <DashboardLink
                                            className={cn(
                                                buttonVariants({
                                                    variant: "ghost",
                                                    className: "justify-start text-xl font-bold py-6 px-4 rounded-2xl w-full tracking-tight",
                                                })
                                            )}
                                            onClick={() => setOpen(false)}
                                        >
                                            Dashboard
                                        </DashboardLink>
                                    </motion.div>
                                ) : (
                                    links.map((link, i) => (
                                        <motion.div
                                            key={link.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 + 0.1 }}
                                        >
                                            <a
                                                className={cn(
                                                    buttonVariants({
                                                        variant: "ghost",
                                                        className: "justify-start text-xl font-bold py-6 px-4 rounded-2xl w-full tracking-tight",
                                                    })
                                                )}
                                                href={link.href}
                                                onClick={() => setOpen(false)}
                                            >
                                                {link.label}
                                            </a>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                            <div className="flex flex-col gap-3 mt-auto pb-12">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {session ? (
                                        <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold" onClick={handleLogout}>
                                            Log out
                                        </Button>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <Button variant="outline" className="w-full h-14 rounded-2xl text-lg font-bold" asChild onClick={() => setOpen(false)}>
                                                <Link to="/login">Sign In</Link>
                                            </Button>
                                            <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl" asChild onClick={() => setOpen(false)}>
                                                <Link to="/signup">Get Started</Link>
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
