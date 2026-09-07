import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { api } from "@/lib/auth/authFetch";
import type {
  BulkDeleteInput,
  BulkDeleteResult,
  CreateSubscriberInput,
  Device,
  SubscribersFilter,
  Subscriber,
  UpdateSubscriberInput,
} from "@/lib/types";

export type {
  Device,
  Subscriber,
  UpdateSubscriberInput,
  CreateSubscriberInput,
  BulkDeleteInput,
  BulkDeleteResult,
  SubscribersFilter,
} from "@/lib/types";

const STALE_TIME = 1000 * 60; // 1 minute
const GC_TIME = 1000 * 60 * 5; // 5 minutes

const listParams = (workspaceId: string, filters?: SubscribersFilter) => {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.ordering) params.append("ordering", filters.ordering);
  return params;
};

export function useSubscribers(filters?: SubscribersFilter) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["subscribers", "list", workspaceId, filters],
    queryFn: async () => {
      try {
        const params = listParams(workspaceId as string, filters);
        const qs = params.toString();
        const data = await api.get<unknown>(
          `/v1/dashboard/subscribers/${qs ? `?${qs}` : ""}`,
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
        return (Array.isArray(data)
          ? data
          : (data as { results?: Subscriber[] }).results || []) as Subscriber[];
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load subscribers"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useSubscriber(subscriberId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["subscribers", "detail", subscriberId],
    queryFn: async () => {
      try {
        return await api.get<Subscriber>(`/v1/dashboard/subscribers/${subscriberId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load subscriber"));
      }
    },
    enabled: !!workspaceId && !!subscriberId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useUpdateSubscriber(subscriberId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: UpdateSubscriberInput) => {
      try {
        return await api.patch<Subscriber>(
          `/v1/dashboard/subscribers/${subscriberId}/`,
          input,
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update subscriber"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscribers", "list", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscribers", "detail", subscriberId],
      });
    },
  });
}

export function useCreateSubscriber() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: CreateSubscriberInput) => {
      try {
        return await api.post<Subscriber>("/v1/dashboard/subscribers/", input, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create subscriber"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscribers", "list", workspaceId],
      });
    },
  });
}

export function useBulkDeleteSubscribers() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: BulkDeleteInput) => {
      try {
        return await api.post<BulkDeleteResult>(
          "/v1/dashboard/subscribers/bulk-delete/",
          input,
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete subscribers"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscribers", "list", workspaceId],
      });
    },
  });
}
