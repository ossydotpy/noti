import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import { CopyIcon, CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiKeyCreatedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    apiKey: {
        id: string;
        name: string;
        key_prefix: string;
        api_key: string;
        created_at: string;
    } | null;
}

export function ApiKeyCreatedDialog({
    open,
    onOpenChange,
    apiKey,
}: ApiKeyCreatedDialogProps) {
    const [copied, setCopied] = useState(false);

    if (!apiKey) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(apiKey.api_key);
            setCopied(true);
            toast.success("API key copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    const handleClose = () => {
        setCopied(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
                <div className="px-8 pt-8 pb-6 border-b border-border/50">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl font-bold tracking-tight">
                            API Key Created
                        </DialogTitle>
                        <p className="text-muted-foreground">
                            Your new API key has been created successfully.
                        </p>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <WarningIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                This is the only time you will see this key
                            </p>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                                Copy it now and store it securely. If you lose it, you&apos;ll need to create a new key.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Key Name
                        </p>
                        <p className="text-sm font-medium">{apiKey.name}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            API Key
                        </p>
                        <div className="flex gap-3">
                            <GlassInputWrapper className="flex-1 font-mono text-xs">
                                <input
                                    type="text"
                                    value={apiKey.api_key}
                                    readOnly
                                    className="w-full bg-transparent p-4 rounded-2xl focus:outline-none text-foreground/80"
                                />
                            </GlassInputWrapper>
                            <Button
                                onClick={handleCopy}
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "shrink-0 h-12 w-12 rounded-2xl transition-colors",
                                    copied && "border-green-500/50 text-green-600"
                                )}
                            >
                                {copied ? (
                                    <CheckIcon className="size-5" />
                                ) : (
                                    <CopyIcon className="size-5" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Prefix: <code className="text-xs bg-muted px-1.5 py-1 rounded-lg">{apiKey.key_prefix}</code>
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleClose} className="h-12 rounded-2xl px-6">
                            I&apos;ve Copied the Key
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
