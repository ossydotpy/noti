import {
  useWorkspaceProviders,
  useProviderTypes,
} from "@/hooks/use-providers";
import { ChannelSection } from "@/components/providers/channel-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Outlet, createFileRoute, useMatchRoute } from "@tanstack/react-router";
import type { Provider, ProviderChannel, ProviderType } from "@/lib/types";
import { CheckCircleIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const CHANNELS: ProviderChannel[] = ["sms", "push", "in_app"];

export const Route = createFileRoute("/_authenticated/$wsSlug/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const { wsSlug } = Route.useParams();
  const matchRoute = useMatchRoute();
  const { data: providers, isLoading: isLoadingProviders } = useWorkspaceProviders();
  const { data: types, isLoading: isLoadingTypes } = useProviderTypes();

  const isChildRoute =
    matchRoute({ to: "/$wsSlug/providers/new", params: { wsSlug }, fuzzy: false }) ||
    matchRoute({
      to: "/$wsSlug/providers/$providerId",
      params: { wsSlug, providerId: "" },
      fuzzy: false,
    });

  if (isChildRoute) {
    return <Outlet />;
  }

  const isLoading = isLoadingProviders || isLoadingTypes;
  const configuredProviders = providers?.length ?? 0;
  const availableProviders = types?.filter(
    (type) => !providers?.some((provider) => provider.provider_type === type.key)
  ).length ?? 0;

  const groupedProviders = CHANNELS.reduce(
    (acc, channel) => {
      acc[channel] = providers?.filter((p) => p.channel === channel) || [];
      return acc;
    },
    {} as Record<ProviderChannel, Provider[]>
  );

  const groupedTypes = CHANNELS.reduce(
    (acc, channel) => {
      const allTypes = types?.filter((t: ProviderType) => t.channel === channel) || [];
      const configuredTypeKeys = new Set(groupedProviders[channel].map((p) => p.provider_type));
      // Only show types that haven't been configured yet
      acc[channel] = allTypes.filter((t) => !configuredTypeKeys.has(t.key));
      return acc;
    },
    {} as Record<ProviderChannel, ProviderType[]>
  );

  // Auto-inject default in-app provider if none exist
  if (!isLoading && groupedProviders.in_app.length === 0) {
    groupedProviders.in_app = [
      {
        id: "system-in-app",
        name: "Default In-App",
        type_name: "In-App",
        provider_type: "in_app",
        channel: "in_app" as const,
        is_active: true,
        priority: 1,
        config: {},
        workspace: "",
      },
    ];
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-7 shadow-[0_18px_50px_-35px_hsl(var(--foreground)/0.35)] sm:px-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
                Integrations
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Connect the services that deliver your notifications. Configure a provider once, then route messages by channel.
              </p>
            </div>
          </div>
          <Button asChild className="h-11 shrink-0 rounded-xl px-4 shadow-sm">
            <a href="#available-integrations">
              <PlusIcon className="mr-2 size-4" weight="bold" />
              Add integration
            </a>
          </Button>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/70 pt-5 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="size-4 text-emerald-500" weight="fill" />
            <span className="font-medium text-foreground tabular-nums">{configuredProviders}</span>
            <span className="text-muted-foreground">connected</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div>
            <span className="font-medium text-foreground tabular-nums">{availableProviders}</span>{" "}
            <span className="text-muted-foreground">available to connect</span>
          </div>
        </div>
      </header>

      <div id="available-integrations" className="space-y-12">
        {CHANNELS.map((channel) => (
          <div key={channel}>
            {isLoading ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-2 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[140px] rounded-2xl" />
                  ))}
                </div>
              </div>
            ) : (
              <ChannelSection
                channel={channel}
                providers={groupedProviders[channel]}
                availableTypes={groupedTypes[channel]}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
