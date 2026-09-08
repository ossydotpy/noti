import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { api } from "@/lib/auth/authFetch";
import type {
  NotificationComposeContext,
  SendNotificationInput,
  SendNotificationResponse,
} from "@/lib/types";

export function useNotificationComposeContext() {
  const { workspaceId } = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["notifications", "compose-context", workspaceId],
    queryFn: async () => {
      try {
        return await api.get<NotificationComposeContext>(
          "/v1/dashboard/notifications/compose-context/",
          { headers: { "X-Workspace-ID": workspaceId as string } },
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load notification context"));
      }
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useSendNotification() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendNotificationInput) => {
      try {
        return await api.post<SendNotificationResponse>(
          "/v1/dashboard/notifications/send/",
          input,
          { headers: { "X-Workspace-ID": workspaceId as string } },
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to send notification"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
