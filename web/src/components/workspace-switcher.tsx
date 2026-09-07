import * as React from "react";
import { CaretDownIcon, PlusIcon, SpinnerIcon, CheckIcon } from "@phosphor-icons/react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { useSidebar } from "@/components/ui/sidebar";
import type { Workspace } from "@/lib/types";

function CreateWorkspaceForm({ onClose }: { onClose: () => void }) {
    const [name, setName] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const { mutate: createWorkspace, isPending, error, reset } = useCreateWorkspace();

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        if (trimmed.length < 5) {
            setLocalError("Name must be at least 5 characters long.");
            return;
        }
        createWorkspace({ name: trimmed }, { onSuccess: onClose });
    }

    return (
        <form onSubmit={handleSubmit} className="p-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">
                New Workspace
            </p>
            <Input
                autoFocus
                placeholder="Enter workspace name"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    if (error) reset();
                    if (localError && e.target.value.trim().length >= 5) {
                        setLocalError(null);
                    }
                }}
                className={`h-8 text-sm bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-primary/30 ${error || localError ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}
                disabled={isPending}
            />
            {(localError || error) && (
                <p className="text-[11px] text-destructive/80 leading-tight px-1">{localError ?? error?.message}</p>
            )}
            <div className="flex gap-2 px-1">
                <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs flex-1 bg-primary hover:bg-primary/90"
                    disabled={!name.trim() || isPending}
                >
                    {isPending ? <SpinnerIcon className="size-3 animate-spin" /> : "Create"}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                    disabled={isPending}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

interface WorkspaceSwitcherProps {
    initialWorkspaces?: Workspace[];
    initialActiveWorkspace?: Workspace | null;
}

export function WorkspaceSwitcher({
    initialWorkspaces = [],
    initialActiveWorkspace = null
}: WorkspaceSwitcherProps) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const { workspaces, activeWorkspace, activeWorkspaceId, switchWorkspace } = useWorkspaces({
        initialActiveWorkspace,
    });
    const [showCreate, setShowCreate] = React.useState(false);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (!open) setShowCreate(false);
    }, [open]);

    const triggerLabel = activeWorkspace?.name ?? "Select workspace";

    if (isCollapsed) {
        return null;
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button className="w-full h-9 rounded-md px-3 flex items-center gap-2 text-left border border-transparent hover:border-border/30 focus-visible:outline-none">
                    <span className="truncate font-semibold text-[13px] text-foreground flex-1">
                        {triggerLabel}
                    </span>
                    <CaretDownIcon className={`size-3 text-muted-foreground/60 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 rounded-md border border-border/50 bg-popover shadow-lg p-1"
                align="start"
                sideOffset={4}
            >
                {showCreate ? (
                    <CreateWorkspaceForm onClose={() => setShowCreate(false)} />
                ) : (
                    <>
                        {workspaces.length > 0 ? (
                            <div className="space-y-0.5">
                                {workspaces.map((workspace: Workspace) => {
                                    const isActive = activeWorkspaceId === workspace.id;
                                    return (
                                        <DropdownMenuItem
                                            key={workspace.id}
                                            onClick={() => {
                                                switchWorkspace(workspace.slug);
                                                setOpen(false);
                                            }}
                                            className="relative px-2.5 py-1.5 rounded cursor-pointer group/item outline-none"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[13px] ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {workspace.name}
                                                </span>
                                                {isActive && (
                                                    <CheckIcon className="size-3 text-primary shrink-0" weight="bold" />
                                                )}
                                            </div>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-2.5 py-4 text-center">
                                <p className="text-sm font-medium text-muted-foreground">No workspaces yet</p>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Create one to get started</p>
                            </div>
                        )}

                        {workspaces.length > 0 && (
                            <DropdownMenuSeparator className="bg-border/50 my-1" />
                        )}

                        <DropdownMenuItem
                            className="gap-2 px-2.5 py-1.5 rounded cursor-pointer group/add outline-none"
                            onClick={(e) => {
                                e.preventDefault();
                                setShowCreate(true);
                            }}
                        >
                            <PlusIcon className="size-3 text-muted-foreground/70 group-hover/add:text-primary shrink-0" />
                            <span className="text-[13px] text-muted-foreground group-hover/add:text-foreground">
                                Create workspace
                            </span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
