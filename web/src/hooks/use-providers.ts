import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { providerKeys } from "@/lib/api/provider-keys";
import { api } from "@/lib/auth/authFetch";
import type { Provider, ProviderChannel, ProviderType } from "@/lib/types";

export type { Provider, ProviderChannel, ProviderType } from "@/lib/types";

const STALE_TIME_PROVIDERS = 1000 * 60; // 1 minute
const GC_TIME_PROVIDERS = 1000 * 60 * 5; // 5 minutes
const STALE_TIME_TYPES = 1000 * 60 * 60 * 24; // 24 hours
const GC_TIME_TYPES = 1000 * 60 * 60 * 24 * 7; // 7 days

export function useWorkspaceProviders() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: providerKeys.list(workspaceId || undefined),
    queryFn: async () => {
      try {
        const data = await api.get<unknown>("/v1/dashboard/providers/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
        return (Array.isArray(data)
          ? data
          : (data as { results?: Provider[] }).results || []) as Provider[];
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load providers"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME_PROVIDERS,
    gcTime: GC_TIME_PROVIDERS,
  });
}

export function useProviderTypes() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: providerKeys.availableTypes(),
    queryFn: async () => {
      try {
        const data = await api.get<unknown>("/v1/dashboard/providers/available_types/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
        return (Array.isArray(data)
          ? data
          : (data as { results?: ProviderType[] }).results || []) as ProviderType[];
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load provider types"));
      }
    },
    staleTime: STALE_TIME_TYPES,
    gcTime: GC_TIME_TYPES,
    enabled: !!workspaceId,
  });
}

export function useInvalidateProviders() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return queryClient.invalidateQueries({
    queryKey: providerKeys.list(workspaceId || undefined),
  });
}
export function useProvider(providerId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: providerKeys.detail(providerId ?? ""),
    queryFn: async () => {
      try {
        return await api.get<Provider>(`/v1/dashboard/providers/${providerId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load provider details"));
      }
    },
    enabled: !!workspaceId && !!providerId,
    staleTime: STALE_TIME_PROVIDERS,
    gcTime: GC_TIME_PROVIDERS,
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return async (providerId: string) => {
    try {
      await api.delete(`/v1/dashboard/providers/${providerId}/`, {
        headers: { "X-Workspace-ID": workspaceId as string },
      });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Failed to disconnect provider"));
    }

    await queryClient.invalidateQueries({
      queryKey: providerKeys.list(workspaceId || undefined),
    });
  };
}
