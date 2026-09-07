import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface MenuToggleIconProps {
    open: boolean;
    className?: string;
    duration?: number;
}

export function MenuToggleIcon({ open, className, duration = 0.3 }: MenuToggleIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("size-6", className)}
        >
            <motion.path
                initial={false}
                animate={open ? { d: "M 18 6 L 6 18" } : { d: "M 3 6 L 21 6" }}
                transition={{ duration }}
            />
            <motion.path
                initial={false}
                animate={open ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration }}
                d="M 3 12 L 21 12"
            />
            <motion.path
                initial={false}
                animate={open ? { d: "M 18 18 L 6 6" } : { d: "M 3 18 L 21 18" }}
                transition={{ duration }}
            />
        </svg>
    );
}
