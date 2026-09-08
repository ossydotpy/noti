
import { cn } from "@/lib/utils";
import { type ProviderType } from "@/hooks/use-providers";
import { getProviderMeta } from "@/lib/provider-meta";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";

interface AvailableProviderCardProps {
  providerType: ProviderType;
  className?: string;
}

export function AvailableProviderCard({ providerType, className }: AvailableProviderCardProps) {
  const params = useParams({ strict: false }) as { wsSlug?: string };
  const wsSlug = params?.wsSlug;
  const setupUrl = `/${wsSlug}/providers/new?type=${providerType.key}`;
  const meta = getProviderMeta(providerType.key);

  const iconUrl = providerType.icon_url;

  return (
    <div>
      <Link to={setupUrl} className="block">
        <div
          className={cn(
            "group relative flex min-h-[164px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-5 shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200",
            "hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5",
            className
          )}
        >
          <div className="relative z-10 flex items-start gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-xl p-1.5">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="size-full object-contain" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: meta.logo }} />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
                {providerType.name}
              </h3>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
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
                className="flex min-h-10 items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
              >
                <BookOpenIcon className="size-3" />
                <span>Docs</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                Connect
              </span>
              <ArrowRightIcon className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
