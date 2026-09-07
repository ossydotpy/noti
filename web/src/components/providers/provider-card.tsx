
import { cn } from "@/lib/utils";
import { type Provider, useDisconnectProvider } from "@/hooks/use-providers";
import { getProviderMeta, CHANNEL_META, getProviderIconUrl, getProviderDocsUrl } from "@/lib/provider-meta";
import { isBackendError } from "@/lib/api-utils";
import { ArrowUpRightIcon, TrashIcon, XIcon, CheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface ProviderCardProps {
  provider: Provider;
  className?: string;
  isSystem?: boolean;
  disableLink?: boolean;
}

export function ProviderCard({ provider, className, isSystem, disableLink }: ProviderCardProps) {
  const params = useParams({ strict: false }) as { wsSlug?: string };
  const wsSlug = params?.wsSlug;
  const configUrl = `/${wsSlug}/providers/${provider.id}`;
  const meta = getProviderMeta(provider.provider_type || "");
  const channelMeta = CHANNEL_META[provider.channel];
  
  const disconnect = useDisconnectProvider();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setIsDeleting(true);
      await disconnect(provider.id);
      toast.success("Provider disconnected successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const getErrorMessage = (err: unknown): string => {
    if (isBackendError(err)) {
      if (err.status >= 500) {
        return "Server error, try again later";
      }
      return err.payload && typeof err.payload === "object" && "detail" in err.payload
        ? String((err.payload as { detail: unknown }).detail)
        : "Failed to disconnect provider";
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "Failed to disconnect provider";
  };

  const cardContent = (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl p-5 min-h-[140px] transition-all duration-300 overflow-hidden border",
        "bg-card border-border",
        "dark:border-white/[0.06] dark:bg-white/[0.02]",
        !disableLink && "hover:shadow-lg hover:border-primary/30",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.03] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors leading-tight">
              {provider.name}
            </h3>
            <p className="text-[11px] text-muted-foreground/70 font-mono leading-none">
              {meta.key}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-20">
          <AnimatePresence mode="wait">
            {showConfirm ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded-full p-0.5"
              >
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="size-6 flex items-center justify-center rounded-full hover:bg-destructive hover:text-white transition-all duration-200 text-destructive disabled:opacity-50"
                  title="Confirm disconnect"
                >
                  <CheckIcon className="size-3" />
                </button>
                <button
                  onClick={cancelDelete}
                  className="size-6 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-200 text-muted-foreground"
                  title="Cancel"
                >
                  <XIcon className="size-3" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="trash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleDelete}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-all duration-300 border",
                  "bg-background border-border/60 text-muted-foreground/40",
                  "dark:bg-white/[0.03] dark:border-white/[0.08]",
                  "hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
                )}
                title="Disconnect provider"
              >
                <TrashIcon className="size-3" />
              </motion.button>
            )}
          </AnimatePresence>

          {!disableLink && (
            <div className={cn(
              "flex size-7 items-center justify-center rounded-full transition-all duration-300 border",
              "bg-background border-border/60 text-muted-foreground/40",
              "dark:bg-white/[0.03] dark:border-white/[0.08]",
              "group-hover:text-primary group-hover:border-primary/30"
            )}>
              <ArrowUpRightIcon className="size-3" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: status + channel */}
      <div className="mt-auto pt-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                provider.is_active
                  ? "bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/40"
                  : "bg-muted-foreground/30"
              )}
            />
            <span className={cn(
              "text-[11px] font-medium",
              provider.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
            )}>
              {provider.is_active ? "Active" : "Paused"}
            </span>
          </div>

          {isSystem && (
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium">
              Built-in
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            P{provider.priority}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium",
            "bg-muted/60 text-muted-foreground/80 dark:bg-white/[0.05]"
          )}>
            <span className={cn("size-1 rounded-full", channelMeta.dotColor)} />
            {channelMeta.label}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {disableLink ? (
        cardContent
      ) : (
        <Link to={configUrl} className="block">
          {cardContent}
        </Link>
      )}
    </motion.div>
  );
}
