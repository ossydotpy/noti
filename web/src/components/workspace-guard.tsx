import { PlusIcon, BuildingsIcon, SpinnerIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/use-workspaces";
import { Input } from "@/components/ui/input";
import React from "react";
import { cn } from "@/lib/utils";

function CreateWorkspaceInline() {
  const [name, setName] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const { mutate: createWorkspace, isPending, error, reset } = useCreateWorkspace();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length < 5) {
      setLocalError("Name must be at least 5 characters long.");
      return;
    }
    createWorkspace({ name: trimmed }, { onSuccess: () => setShow(false) });
  }

  if (show) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 w-full max-w-sm p-6 rounded-xl border bg-card shadow-lg"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest leading-none">New Workspace</h3>
          <p className="text-xs text-muted-foreground font-medium">Choose a unique name for your project.</p>
        </div>
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) reset();
              if (localError && e.target.value.trim().length >= 5) {
                setLocalError(null);
              }
            }}
            disabled={isPending}
            className={cn(
              "h-10 bg-muted/30 border-border/50 text-foreground rounded-lg",
              (error || localError) && "border-destructive/50 focus-visible:ring-destructive/20"
            )}
          />
          {(localError || error) && (
            <p className="text-[11px] text-destructive font-medium leading-none ml-1">{localError ?? error?.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1 h-10 rounded-lg font-semibold"
            disabled={!name.trim() || isPending}
          >
            {isPending ? <SpinnerIcon className="size-4 animate-spin" /> : "Create Workspace"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShow(false)}
            disabled={isPending}
            className="h-10 rounded-lg font-semibold px-4"
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button onClick={() => setShow(true)} size="lg" className="h-12 px-10 rounded-full font-bold shadow-xl shadow-primary/10 transition-all hover:shadow-primary/20">
      <PlusIcon className="size-5 mr-1" />
      Start with a Workspace
    </Button>
  );
}

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { workspaces, isPending, error, isError } = useWorkspaces();
  const hasWorkspaces = workspaces.length > 0;

  if (isError) {
    throw error || new Error("Failed to load workspaces from backend");
  }

  if (!isPending && !hasWorkspaces) {
    return (
      <div className="flex flex-col h-full min-h-[60vh] w-full items-center justify-center p-6 bg-background font-sans">
        <div className="flex flex-col items-center gap-10 text-center max-w-md w-full">

          <div className="relative group">
            <div className="relative flex size-20 items-center justify-center rounded-2xl border bg-card shadow-sm transition-colors group-hover:border-primary/30">
              <BuildingsIcon className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-display">
              Command Center
            </h2>
            <p className="text-base text-muted-foreground font-medium leading-relaxed">
              Create your first workspace to start orchestrating SMS, Push, and In-App notifications.
            </p>
          </div>

          <div className="w-full flex justify-center">
            <CreateWorkspaceInline />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
