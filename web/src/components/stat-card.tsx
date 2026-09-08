import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type StatCardTone = "info" | "success" | "warning" | "danger" | "muted";

interface StatCardRow {
    label: string;
    value: string | number;
    tone?: StatCardTone;
}

interface StatCardProps {
    title: string;
    score: string;
    rows: StatCardRow[];
    subtitle?: string;
    variant?: "primary" | "secondary";
    className?: string;
}

export function StatCard({
    title,
    score,
    rows,
    subtitle,
    variant = "secondary",
    className
}: StatCardProps) {
    const isPrimary = variant === "primary";

    const toneClassNames: Record<StatCardTone, string> = {
        info: "bg-blue-500",
        success: "bg-emerald-500",
        warning: "bg-amber-400",
        danger: "bg-red-500",
        muted: "bg-neutral-500"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
                "relative flex flex-col rounded-2xl p-6 min-h-[214px] overflow-hidden border transition-[border-color,box-shadow,transform] duration-200 ease-out",
                isPrimary
                    ? "bg-neutral-950 border-white/10 text-white"
                    : "bg-card border-border",
                "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                className
            )}
        >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5" />

            <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                    <h3 className={cn(
                        "text-sm font-medium tracking-tight",
                        isPrimary ? "text-white/55" : "text-muted-foreground"
                    )}>
                        {title}
                    </h3>
                    <p className={cn(
                        "text-5xl leading-none font-semibold tracking-[-0.04em] tabular-nums",
                        isPrimary ? "text-white" : "text-foreground"
                    )}>
                        {score}
                    </p>
                    {subtitle ? (
                        <p className={cn(
                            "text-xs",
                            isPrimary ? "text-white/55" : "text-muted-foreground"
                        )}>
                            {subtitle}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="relative z-10 mt-7 space-y-0.5">
                {rows.map((row, index) => (
                    <div
                        key={`${row.label}-${index}`}
                        className={cn(
                            "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3",
                            index > 0 ? (isPrimary ? "border-t border-white/10" : "border-t border-border") : ""
                        )}
                    >
                        <span className={cn(
                            "size-2 rounded-full",
                            toneClassNames[row.tone ?? "muted"]
                        )} />
                        <span className={cn(
                            "text-sm",
                            isPrimary ? "text-white/90" : "text-foreground"
                        )}>
                            {row.label}
                        </span>
                        <span className={cn(
                            "text-sm tabular-nums justify-self-end",
                            isPrimary ? "text-white" : "text-foreground"
                        )}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

interface StatCardFallbackProps {
    className?: string;
}

export function StatCardFallback({ className }: StatCardFallbackProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col rounded-2xl p-6 min-h-[214px] overflow-hidden border bg-card border-border",
                className
            )}
        >
            <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
                <div className="h-10 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
            </div>

            <div className="mt-7 space-y-3">
                {[...Array(3)].map((_, index) => (
                    <div
                        key={index}
                        className={cn(
                            "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3",
                            index > 0 ? "border-t border-border" : ""
                        )}
                    >
                        <div className="size-2 rounded-full bg-muted animate-pulse" />
                        <div className="h-4 w-20 rounded bg-muted/70 animate-pulse" />
                        <div className="h-4 w-12 rounded bg-muted animate-pulse justify-self-end" />
                    </div>
                ))}
            </div>
        </div>
    );
}
