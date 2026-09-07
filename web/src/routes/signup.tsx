import React, { useState } from "react";
import { Link, createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeSlashIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { motion, type Variants } from "motion/react";
import { auth } from "@/lib/auth";
import { ApiError, api } from "@/lib/auth/authFetch";
import { getWorkspaceDashboardPath } from "@/lib/routes";
import type { Workspace } from "@/lib/types";
import { Button } from "@/components/ui/button";

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

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/50 focus-within:bg-primary/5">
        {children}
    </div>
);

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 },
    },
};

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
        <div className="min-h-[100dvh] flex flex-col md:flex-row font-sans w-full overflow-hidden bg-background">
            {/* Left column: signup form */}
            <section className="flex-1 flex items-center justify-center p-8 z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-md space-y-8"
                >
                    <div className="flex flex-col gap-6">
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
                        <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold tracking-tight">
                            <span className="font-light text-muted-foreground mr-2">Create</span>
                            account.
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-muted-foreground">
                            Join us to start managing your notifications efficiently
                        </motion.p>

                        <form className="space-y-4" onSubmit={handleSignup}>
                            <motion.div variants={itemVariants}>
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
                            </motion.div>

                            <motion.div variants={itemVariants}>
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
                            </motion.div>

                            <motion.div variants={itemVariants}>
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
                            </motion.div>

                            {error && <p className="text-sm text-destructive px-1">{error}</p>}

                            <motion.div variants={itemVariants} className="pt-2">
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                                >
                                    {loading ? "Creating account..." : "Create Account"}
                                </Button>
                            </motion.div>
                        </form>

                        <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
                            Already have an account? {" "}
                            <Link to="/login" className="text-primary font-bold hover:underline transition-colors">
                                Sign In
                            </Link>
                        </motion.p>
                    </div>
                </motion.div>
            </section>

            {/* Right column: hero gradient */}
            <section className="hidden md:block flex-1 relative p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-6 rounded-[2.5rem] shadow-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-secondary/10 to-background/70"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-transparent to-muted-foreground/20 opacity-80" />
                    <div className="absolute -top-12 left-4 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.6),_rgba(14,165,233,0))] blur-3xl opacity-70" />
                    <div className="absolute bottom-10 right-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.5),_rgba(249,115,22,0))] blur-3xl opacity-80" />
                    <div className="absolute inset-x-6 top-12 h-16 rounded-[32px] bg-[radial-gradient(circle,_rgba(255,255,255,0.25),_rgba(255,255,255,0))] blur-2xl opacity-60" />
                </motion.div>
            </section>
        </div>
    );
}

function SignupPage() {
  return <SignupClient />;
}
