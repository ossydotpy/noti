
import { cn } from "@/lib/utils";
import { type ProviderType } from "@/hooks/use-providers";
import { getProviderMeta } from "@/lib/provider-meta";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";

interface AvailableProviderCardProps {
  providerType: ProviderType;
  className?: string;
}

export function AvailableProviderCard({ providerType, className }: AvailableProviderCardProps) {
  const params = useParams({ strict: false }) as { wsSlug?: string };
  const wsSlug = params?.wsSlug;
  const setupUrl = `/${wsSlug}/providers/new?type=${providerType.key}`;
  const meta = getProviderMeta(providerType.key);

  // Use backend icon_url if available, fallback to hardcoded SVG
  const iconUrl = providerType.icon_url;
  const hasIconUrl = iconUrl && iconUrl.startsWith("/icons/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link to={setupUrl} className="block">
        <div
          className={cn(
            "group relative flex flex-col rounded-2xl p-5 min-h-[140px] transition-all duration-300 overflow-hidden",
            "border border-dashed border-border/70",
            "dark:border-white/6",
            "hover:border-solid hover:border-primary/40 hover:shadow-md hover:bg-card/50",
            "bg-transparent",
            className
          )}
        >
          <div className="flex items-start gap-3 relative z-10">
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground/70 tracking-tight group-hover:text-primary transition-colors leading-tight">
                {providerType.name}
              </h3>
              <p className="text-[11px] text-muted-foreground/50 leading-snug line-clamp-2">
                {meta.description}
              </p>
            </div>
          </div>

          {/* Bottom row: Docs link + CTA */}
          <div className="mt-auto pt-4 flex items-center justify-between relative z-10">
            {providerType.docs_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(providerType.docs_url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-primary transition-colors"
              >
                <BookOpenIcon className="size-3" />
                <span>Docs</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] font-medium text-muted-foreground/50 group-hover:text-primary transition-colors">
                Connect
              </span>
              <ArrowRightIcon className="size-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
