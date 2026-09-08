import React, { useState } from "react";
import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { auth } from "@/lib/auth";
import { ApiError, api } from "@/lib/auth/authFetch";
import { getWorkspaceDashboardPath } from "@/lib/routes";
import type { Workspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AuthShell, GlassInputWrapper } from "@/components/auth/auth-shell";

async function getFirstWorkspaceDashboardPath(): Promise<string | null> {
  const workspaces = await api.get<Workspace[]>("/v1/dashboard/workspaces/");
  return workspaces[0] ? getWorkspaceDashboardPath(workspaces[0].slug) : null;
}

async function resolvePostLoginPath(redirectTo?: string): Promise<string> {
  if (redirectTo) return redirectTo;
  try {
    return (await getFirstWorkspaceDashboardPath()) ?? "/onboarding";
  } catch {
    return "/onboarding";
  }
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirectTo =
      typeof search.redirect === "string" ? search.redirect : undefined;
    return redirectTo ? { redirect: redirectTo } : {};
  },
  loader: async ({ context }) => {
    await context.auth.ready;
    if (context.auth.status !== "authenticated") return;

    let target: string | null = null;
    try {
      target = await getFirstWorkspaceDashboardPath();
    } catch {
      target = null;
    }
    throw redirect({ href: target ?? "/onboarding" });
  },
  head: () => ({
    meta: [{ title: "Sign in | noti" }],
  }),
  component: LoginPage,
});

function LoginClient() {
    const { redirect: redirectTo } = Route.useSearch();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await auth.signIn(email, password);
            router.history.push(await resolvePostLoginPath(redirectTo));
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError("Invalid email or password.");
            } else if (err instanceof ApiError) {
                setError(err.message || "Something went wrong");
            } else {
                setError("Something went wrong");
            }
            setLoading(false);
        }
    };

    return (
        <AuthShell>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="font-light text-muted-foreground mr-2">Welcome</span>
                            back.
                        </h1>
                        <p className="text-muted-foreground">
                            Access your account and continue your journey with us
                        </p>

                        <form className="space-y-5" onSubmit={handleLogin}>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground ml-1">Email Address</label>
                                <GlassInputWrapper>
                                    <input
                                        required
                                        type="email"
                                        placeholder="Enter your email"
                                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </GlassInputWrapper>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground ml-1">Password</label>
                                <GlassInputWrapper>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-3 flex items-center p-2"
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                                            )}
                                        </button>
                                    </div>
                                </GlassInputWrapper>
                            </div>

                            <div className="flex items-center justify-between text-sm px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary/50" />
                                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">Keep me signed in</span>
                                </label>
                            </div>

                            {error && <p className="text-sm text-destructive px-1">{error}</p>}

                            <div>
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                                >
                                    {loading ? "Signing in..." : "Sign In"}
                                </Button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-muted-foreground">
                            New to our platform? <Link to="/signup" className="text-primary font-bold hover:underline transition-colors">
                                Create Account
                            </Link>
                        </p>
        </AuthShell>
    );
}

function LoginPage() {
  return <LoginClient />;
}
