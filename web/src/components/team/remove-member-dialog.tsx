import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WarningIcon, SpinnerIcon } from "@phosphor-icons/react";

interface RemoveMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    memberEmail: string;
    isPending: boolean;
}

export function RemoveMemberDialog({
    open,
    onOpenChange,
    onConfirm,
    memberEmail,
    isPending,
}: RemoveMemberDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
                <div className="px-8 pt-8 pb-6 border-b border-border/50">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-destructive">
                            Remove Member
                        </DialogTitle>
                        <p className="text-muted-foreground">
                            This action cannot be undone.
                        </p>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                        <WarningIcon className="size-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive/90">
                            Are you sure you want to remove{" "}
                            <span className="font-semibold">&quot;{memberEmail}&quot;</span>{" "}
                            from the workspace? They will lose access immediately.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                            className="h-12 rounded-2xl px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirm}
                            disabled={isPending}
                            className="h-12 rounded-2xl px-6"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                                    Removing...
                                </span>
                            ) : (
                                "Remove Member"
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
