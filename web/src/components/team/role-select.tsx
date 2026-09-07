
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { MemberRole } from "@/hooks/use-team";

interface RoleSelectProps {
    value: MemberRole;
    onValueChange: (value: MemberRole) => void;
    disabled?: boolean;
}

const roles: MemberRole[] = ["admin", "member", "viewer"];

export function RoleSelect({ value, onValueChange, disabled }: RoleSelectProps) {
    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
