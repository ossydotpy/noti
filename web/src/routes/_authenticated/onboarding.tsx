import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon, SpinnerIcon, LightningIcon, SquaresFourIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/onboarding")({
    component: OnboardingPage,
});

function OnboardingPage() {
    const [name, setName] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const { mutate: createWorkspace, isPending, error, reset } = useCreateWorkspace();
    const { user } = useAuth();

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        if (trimmed.length < 5) {
            setLocalError("Name must be at least 5 characters long.");
            return;
        }
        createWorkspace({ name: trimmed });
    }

    React.useEffect(() => {
        if (name.trim().length >= 5) {
            setLocalError(null);
            if (error) reset();
        }
    }, [name, error, reset]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-10 pointer-events-none">
                <div className="absolute inset-0 rounded-full blur-[120px] bg-primary/30" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-lg z-10"
            >
                <div className="flex flex-col items-center mb-10 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] mb-6"
                    >
                        <LightningIcon className="h-8 w-8 fill-current" />
                    </motion.div>
                    <h1 className="text-4xl font-bold tracking-tighter mb-2">Welcome to ZeroSend</h1>
                    <p className="text-muted-foreground text-lg max-w-xs mx-auto">
                        Let's set up your first workspace to get you started.
                    </p>
                </div>

                <Card className="border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden border">
                    <CardHeader className="pt-8 px-8 pb-4">
                        <CardTitle className="text-xl font-bold">Workspace Name</CardTitle>
                        <CardDescription>
                            This could be your company, project, or team name.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Input
                                    autoFocus
                                    placeholder="Acme Inc."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`h-14 text-lg bg-muted/30 border-input rounded-2xl focus-visible:ring-primary/50 transition-all ${error || localError ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
                                    disabled={isPending}
                                />
                                {(localError || error) && (
                                    <motion.p
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm text-destructive pl-1 font-medium"
                                    >
                                        {localError ?? error?.message}
                                    </motion.p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-14 text-lg font-bold rounded-2xl transition-all shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                                disabled={!name.trim() || isPending}
                            >
                                {isPending ? (
                                    <SpinnerIcon className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <PlusIcon className="mr-2 h-5 w-5" />
                                )}
                                {isPending ? "Creating..." : "Create Workspace"}
                            </Button>
                        </form>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-8 border-border/50">
                            {[
                                { icon: PaperPlaneTiltIcon, label: "Multi-channel", sub: "Email, SMS & Push" },
                                { icon: SquaresFourIcon, label: "Analytics", sub: "Track deliverability" },
                                { icon: LightningIcon, label: "Fast", sub: "Built for speed" }
                            ].map((feature, i) => (
                                <div key={i} className="flex flex-col items-center text-center space-y-1">
                                    <div className="p-2 bg-muted/50 rounded-lg mb-1">
                                        <feature.icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-bold">{feature.label}</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{feature.sub}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center mt-8 text-sm text-muted-foreground">
                    Logged in as <span className="text-foreground font-medium">{user?.email}</span>
                </p>
            </motion.div>

            {/* Visual deco */}
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full" />
        </div>
    );
}
