import * as React from "react"
import { cn } from "@/lib/utils"

interface GlassInputWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: boolean
  children: React.ReactNode
}

function GlassInputWrapper({ className, error, children, ...props }: GlassInputWrapperProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/50 focus-within:bg-primary/5",
        error && "border-destructive focus-within:border-destructive focus-within:bg-destructive/5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const GlassInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <GlassInputWrapper>
        <input
          type={type}
          className={cn(
            "w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50",
            className
          )}
          ref={ref}
          {...props}
        />
      </GlassInputWrapper>
    )
  }
)
GlassInput.displayName = "GlassInput"

export { GlassInput, GlassInputWrapper }
