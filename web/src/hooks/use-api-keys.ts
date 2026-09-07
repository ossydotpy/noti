import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { apiKeyKeys } from "@/lib/api/api-key-keys";
import { api } from "@/lib/auth/authFetch";
import type { APIKey, APIKeyCreateInput, APIKeyCreateResponse } from "@/lib/types";

const STALE_TIME_API_KEYS = 5 * 60 * 1000; // 5 minutes

export function useWorkspaceAPIKeys() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: apiKeyKeys.list(workspaceId || undefined),
    queryFn: async () => {
      try {
        return await api.get<APIKey[]>("/v1/dashboard/api-keys/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load API keys"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME_API_KEYS,
    gcTime: STALE_TIME_API_KEYS * 2,
  });
}

export function useCreateAPIKey() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: APIKeyCreateInput) => {
      try {
        return await api.post<APIKeyCreateResponse>("/v1/dashboard/api-keys/", input, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create API key"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.list(workspaceId || undefined),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRevokeAPIKey() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKeyId: string) => {
      try {
        await api.delete(`/v1/dashboard/api-keys/${apiKeyId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to revoke API key"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.list(workspaceId || undefined),
      });
      toast.success("API key revoked successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
