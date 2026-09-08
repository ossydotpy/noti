import React, { useState } from "react";
import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from "@phosphor-icons/react";
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

export const Route = createFileRoute("/signup")({
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
    meta: [{ title: "Create account | noti" }],
  }),
  component: SignupPage,
});

function SignupClient() {
    const navigate = useNavigate();
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const trimmed = name.trim();
        const [first, ...rest] = trimmed.split(" ");
        try {
            await auth.signUp({
                email,
                password,
                first_name: first || trimmed,
                last_name: rest.join(" ") || undefined,
            });
            navigate({ to: "/onboarding" });
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.fieldError || err.message || "Something went wrong"
                    : "Something went wrong"
            );
            setLoading(false);
        }
    };

    return (
        <AuthShell>
                        <div className="-ml-1">
                            <Button
                                variant="ghost"
                                onClick={() => router.history.back()}
                                aria-label="Go back"
                                className="inline-flex items-center gap-2 text-sm"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                Back
                            </Button>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="font-light text-muted-foreground mr-2">Create</span>
                            account.
                        </h1>
                        <p className="text-muted-foreground">
                            Join us to start managing your notifications efficiently
                        </p>

                        <form className="space-y-4" onSubmit={handleSignup}>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground ml-1">Full Name</label>
                                <GlassInputWrapper>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter your name"
                                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </GlassInputWrapper>
                            </div>

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
                                            placeholder="Create a password"
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

                            {error && <p className="text-sm text-destructive px-1">{error}</p>}

                            <div className="pt-2">
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                                >
                                    {loading ? "Creating account..." : "Create Account"}
                                </Button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account? {" "}
                            <Link to="/login" className="text-primary font-bold hover:underline transition-colors">
                                Sign In
                            </Link>
                        </p>
        </AuthShell>
    );
}

function SignupPage() {
  return <SignupClient />;
}
