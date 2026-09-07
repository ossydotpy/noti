import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PaperPlaneTiltIcon, EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { InviteInput, MemberRole } from "@/hooks/use-team";

interface InviteFormProps {
    onSubmit: (data: InviteInput) => Promise<void>;
    isPending: boolean;
}

const roles: { value: MemberRole; label: string; description: string }[] = [
    { value: "admin", label: "Admin", description: "Manage team and settings" },
    { value: "member", label: "Member", description: "Access and configure features" },
    { value: "viewer", label: "Viewer", description: "Read-only access" },
];

export function InviteForm({ onSubmit, isPending }: InviteFormProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<MemberRole>("member");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        await onSubmit({ email: email.trim(), role });
        setEmail("");
        setRole("member");
    };

    const selectedRole = roles.find((r) => r.value === role);

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px,140px] gap-3">
                <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
                        Email address
                    </Label>
                    <div className="relative">
                        <EnvelopeSimpleIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="invite-email"
                            type="email"
                            placeholder="colleague@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isPending}
                            required
                            className="pl-9 h-11 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-input transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="invite-role" className="text-xs text-muted-foreground">
                        Role
                    </Label>
                    <Select value={role} onValueChange={(v) => setRole(v as MemberRole)} disabled={isPending}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-input transition-colors">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="py-2.5">
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span>{r.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-transparent select-none">Action</Label>
                    <Button
                        type="submit"
                        disabled={isPending || !email.trim()}
                        className="h-11 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all active:scale-[0.98]"
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <span className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                Sending
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <PaperPlaneTiltIcon className="size-4" weight="fill" />
                                Invite
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {selectedRole && email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-50 duration-200">
                    <UserCircleIcon className="size-3.5" />
                    <span>
                        <span className="font-medium text-foreground">{selectedRole.label}</span>
                        {" · "}
                        {selectedRole.description}
                    </span>
                </div>
            )}
        </form>
    );
}
