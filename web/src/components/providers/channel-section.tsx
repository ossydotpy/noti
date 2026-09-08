import { cn } from "@/lib/utils";
import { type Provider, type ProviderType, type ProviderChannel } from "@/hooks/use-providers";
import { CHANNEL_META } from "@/lib/provider-meta";
import { ProviderCard } from "./provider-card";
import { AvailableProviderCard } from "./available-provider-card";
import { ArrowUpRightIcon } from "@phosphor-icons/react";

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
    <section className={cn("space-y-5", className)}>
      <div className="flex items-end justify-between gap-4 border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <span className={cn("size-2.5 rounded-full shadow-sm", meta.dotColor)} />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{meta.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {providers.length > 0 ? `${providers.length} connected` : "Choose a delivery service"}
            </p>
          </div>
        </div>
        <ArrowUpRightIcon className="hidden size-4 text-muted-foreground/50 sm:block" />
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
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-border/70 bg-muted/20 px-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            No providers available for this channel
          </p>
        </div>
      )}
    </section>
  );
}
