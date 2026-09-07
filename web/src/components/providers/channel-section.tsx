import { cn } from "@/lib/utils";
import { type Provider, type ProviderType, type ProviderChannel } from "@/hooks/use-providers";
import { CHANNEL_META } from "@/lib/provider-meta";
import { ProviderCard } from "./provider-card";
import { AvailableProviderCard } from "./available-provider-card";

interface ChannelSectionProps {
  channel: ProviderChannel;
  providers: Provider[];
  availableTypes: ProviderType[];
  className?: string;
}

export function ChannelSection({ channel, providers, availableTypes, className }: ChannelSectionProps) {
  const meta = CHANNEL_META[channel];
  const hasContent = providers.length > 0 || availableTypes.length > 0;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Clean section header — no icon container */}
      <div className="flex items-center gap-2.5">
        <span className={cn("size-2 rounded-full", meta.dotColor)} />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          {meta.label}
        </h2>
        <span className="text-xs text-muted-foreground/50 tabular-nums">
          {providers.length} configured
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {providers.map((provider) => {
          const isSystemProvider = provider.id.startsWith("system-");
          return (
            <ProviderCard 
              key={provider.id} 
              provider={provider} 
              isSystem={isSystemProvider}
              disableLink={isSystemProvider}
            />
          );
        })}

        {availableTypes.map((type) => (
          <AvailableProviderCard key={type.key} providerType={type} />
        ))}
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="py-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40">
          <p className="text-xs text-muted-foreground/40 font-medium">
            No providers available for this channel
          </p>
        </div>
      )}
    </div>
  );
}
