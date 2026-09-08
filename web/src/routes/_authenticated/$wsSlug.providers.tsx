import {
  useWorkspaceProviders,
  useProviderTypes,
} from "@/hooks/use-providers";
import { ChannelSection } from "@/components/providers/channel-section";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { Outlet, createFileRoute, useMatchRoute } from "@tanstack/react-router";
import type { Provider, ProviderChannel, ProviderType } from "@/lib/types";

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
    <div className="space-y-10 pb-20">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          Providers
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect and manage your notification delivery services across channels.
        </p>
      </header>

      {/* Channel sections */}
      <div className="space-y-12">
        {CHANNELS.map((channel, index) => (
          <motion.div
            key={channel}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * (index + 1), type: "spring", stiffness: 400, damping: 30 }}
          >
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
