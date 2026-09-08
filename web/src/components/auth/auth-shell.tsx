import type { ReactNode } from "react";

export function GlassInputWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/50 focus-within:bg-primary/5">
      {children}
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row font-sans w-full overflow-hidden bg-background">
      <section className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </section>

      <section className="hidden md:block flex-1 relative p-6">
        <div className="absolute inset-6 rounded-[2.5rem] shadow-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-secondary/10 to-background/70">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-transparent to-muted-foreground/20 opacity-80" />
          <div className="absolute -top-12 left-4 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.6),_rgba(14,165,233,0))] blur-3xl opacity-70" />
          <div className="absolute bottom-10 right-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.5),_rgba(249,115,22,0))] blur-3xl opacity-80" />
          <div className="absolute inset-x-6 top-12 h-16 rounded-[32px] bg-[radial-gradient(circle,_rgba(255,255,255,0.25),_rgba(255,255,255,0))] blur-2xl opacity-60" />
        </div>
      </section>
    </div>
  );
}
