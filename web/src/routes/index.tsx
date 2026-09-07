import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "@/lib/auth/authFetch";
import { getWorkspaceDashboardPath } from "@/lib/routes";
import type { Workspace } from "@/lib/types";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.auth.ready;
    if (context.auth.status !== "authenticated") return;

    let target: string | null = null;
    try {
      const workspaces = await api.get<Workspace[]>("/v1/dashboard/workspaces/");
      target = workspaces[0]
        ? getWorkspaceDashboardPath(workspaces[0].slug)
        : "/onboarding";
    } catch {
      target = null;
    }
    if (target) {
      throw redirect({ href: target });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-10 pointer-events-none">
        <div className="absolute inset-0 rounded-full blur-[100px] bg-primary" />
      </div>

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-16 z-10">
        <div className="w-full max-w-4xl">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              Beta access
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Build your product.
            <br />
            <span className="text-muted-foreground">Not your notification stack.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10">
            One API for email, SMS, push, and in-app notifications. No infrastructure to maintain.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link to="/signup">Start Building</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              Read the Docs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
