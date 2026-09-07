import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SpinnerIcon } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";

interface CreateApiKeyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string) => void;
    isPending: boolean;
}

export function CreateApiKeyModal({
    open,
    onOpenChange,
    onSubmit,
    isPending,
}: CreateApiKeyModalProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Please enter a name for this API key");
            return;
        }

        if (name.length > 100) {
            setError("Name must be 100 characters or less");
            return;
        }

        setError(null);
        onSubmit(name.trim());
    };

    const handleClose = () => {
        setName("");
        setError(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
                <div className="px-8 pt-8 pb-6 border-b border-border/50">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            Create API Key
                        </DialogTitle>
                        <p className="text-muted-foreground">
                            Create a new API key to authenticate API requests.
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="key-name" className="text-sm font-medium">
                            Key Name <span className="text-destructive">*</span>
                        </Label>
                        <GlassInputWrapper className={error ? "border-destructive" : ""}>
                            <input
                                id="key-name"
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setError(null);
                                }}
                                placeholder="e.g., Production API Key"
                                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                                disabled={isPending}
                                autoFocus
                            />
                        </GlassInputWrapper>
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isPending}
                            className="h-12 rounded-2xl px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || !name.trim()}
                            className="h-12 rounded-2xl px-6 min-w-[140px] shadow-lg shadow-primary/20"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2">
                                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                "Create Key"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
