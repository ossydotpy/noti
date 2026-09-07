import { useProvider, useProviderTypes } from "@/hooks/use-providers";
import { ProviderConfigForm } from "@/components/providers/provider-config-form";
import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$wsSlug/providers/$providerId")({
  component: EditProviderPage,
});

function EditProviderPage() {
  const { providerId } = Route.useParams();

  const {
    data: provider,
    isLoading: isLoadingProvider,
  } = useProvider(providerId);
  const { data: types, isLoading: isLoadingTypes } = useProviderTypes();

  const isLoading = isLoadingProvider || isLoadingTypes;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 max-w-3xl space-y-8 pb-20">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-start gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-80 xl:w-96 shrink-0">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const providerType = types?.find(
    (t) => t.key === provider?.provider_type
  );

  if (!provider || !providerType) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Provider not found</h1>
          <p className="text-muted-foreground">
            The provider you are trying to configure could not be found or its type
            is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return <ProviderConfigForm type={providerType} initialData={provider} />;
}
