import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { api } from "@/lib/auth/authFetch";
import type {
  BulkSubscribeInput,
  BulkSubscribeResult,
  BulkUnsubscribeResult,
  CreateTopicInput,
  Topic,
  TopicStats,
  TopicSubscription,
  TopicWithStats,
  UpdateTopicInput,
} from "@/lib/types";

export type {
  Topic,
  TopicWithStats,
  TopicSubscription,
  CreateTopicInput,
  UpdateTopicInput,
  BulkSubscribeInput,
  BulkSubscribeResult,
  BulkUnsubscribeResult,
  TopicStats,
} from "@/lib/types";

const STALE_TIME = 1000 * 60; // 1 minute
const GC_TIME = 1000 * 60 * 5; // 5 minutes

function unwrap<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : (data as { results?: T[] }).results || []) as T[];
}

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

export function useTopics() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["topics", "list", workspaceId],
    queryFn: () =>
      run(
        () =>
          api.get<unknown>("/v1/dashboard/topics/", {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to load topics"
      ).then(unwrap<Topic>),
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTopic(topicId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["topics", "detail", topicId],
    queryFn: () =>
      run(
        () =>
          api.get<TopicWithStats>(`/v1/dashboard/topics/${topicId}/`, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to load topic"
      ),
    enabled: !!workspaceId && !!topicId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTopicStats(topicId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["topics", "stats", topicId],
    queryFn: () =>
      run(
        () =>
          api.get<TopicStats>(`/v1/dashboard/topics/${topicId}/stats/`, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to load topic stats"
      ),
    enabled: !!workspaceId && !!topicId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTopicSubscriptions(topicId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["topics", "subscriptions", topicId],
    queryFn: () =>
      run(
        () =>
          api.get<unknown>(`/v1/dashboard/topics/${topicId}/subscriptions/`, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to load subscriptions"
      ).then(unwrap<TopicSubscription>),
    enabled: !!workspaceId && !!topicId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: CreateTopicInput) =>
      run(
        () =>
          api.post<Topic>("/v1/dashboard/topics/", input, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to create topic"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "list", workspaceId],
      });
    },
  });
}

export function useUpdateTopic(topicId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: UpdateTopicInput) =>
      run(
        () =>
          api.patch<Topic>(`/v1/dashboard/topics/${topicId}/`, input, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to update topic"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "list", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "detail", topicId],
      });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (topicId: string) => {
      await run(
        () =>
          api.delete(`/v1/dashboard/topics/${topicId}/`, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to delete topic"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "list", workspaceId],
      });
    },
  });
}

export function useActivateTopic() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (topicId: string) =>
      run(
        () =>
          api.post<Topic>(
            `/v1/dashboard/topics/${topicId}/activate/`,
            {},
            { headers: { "X-Workspace-ID": workspaceId as string } }
          ),
        "Failed to activate topic"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "list", workspaceId],
      });
    },
  });
}

export function useBulkSubscribe(topicId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: BulkSubscribeInput) =>
      run(
        () =>
          api.post<BulkSubscribeResult>(
            `/v1/dashboard/topics/${topicId}/bulk_subscribe/`,
            input,
            { headers: { "X-Workspace-ID": workspaceId as string } }
          ),
        "Failed to subscribe subscribers"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "subscriptions", topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "stats", topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "detail", topicId],
      });
    },
  });
}

export function useBulkUnsubscribe(topicId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: BulkSubscribeInput) =>
      run(
        () =>
          api.post<BulkUnsubscribeResult>(
            `/v1/dashboard/topics/${topicId}/bulk_unsubscribe/`,
            input,
            { headers: { "X-Workspace-ID": workspaceId as string } }
          ),
        "Failed to unsubscribe subscribers"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "subscriptions", topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "stats", topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "detail", topicId],
      });
    },
  });
}

export function useRemoveSubscription() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async ({
      topicId,
      subscriptionId,
    }: {
      topicId: string;
      subscriptionId: string;
    }) => {
      await run(
        () =>
          api.delete(`/v1/dashboard/topics/subscriptions/${subscriptionId}/`, {
            headers: { "X-Workspace-ID": workspaceId as string },
          }),
        "Failed to remove subscription"
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "subscriptions", variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "stats", variables.topicId],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", "detail", variables.topicId],
      });
    },
  });
}
