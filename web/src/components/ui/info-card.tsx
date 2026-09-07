import * as React from "react"
import { cn } from "@/lib/utils"

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning"
}

function InfoCard({ className, variant = "default", ...props }: InfoCardProps) {
  const variants = {
    default: "from-primary/5 via-background to-secondary/20",
    success: "from-emerald-500/5 via-background to-emerald-500/10",
    warning: "from-amber-500/5 via-background to-amber-500/10",
  }

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-gradient-to-br p-6",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

function InfoCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("font-semibold mb-3", className)}
      {...props}
    />
  )
}

function InfoCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm", className)}
      {...props}
    />
  )
}

export { InfoCard, InfoCardHeader, InfoCardContent }
