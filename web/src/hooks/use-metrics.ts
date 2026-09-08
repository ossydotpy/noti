import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/lib/api/workspace-keys";
import { api } from "@/lib/auth/authFetch";
import type { DashboardMetrics, DashboardRecentNotification } from "@/lib/types";
import { getApiErrorMessage } from "@/hooks/use-workspaces";

/**
 * Fetch dashboard counters for the given workspace. Sends `X-Workspace-ID`
 * so the backend resolves the correct workspace.
 */
export async function getDashboardMetrics(
  activeWorkspaceId?: string | null
): Promise<DashboardMetrics> {
  try {
    return await api.get<DashboardMetrics>("/v1/dashboard/metrics/", {
      headers: activeWorkspaceId ? { "X-Workspace-ID": activeWorkspaceId } : undefined,
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load metrics"));
  }
}

export function useDashboardMetrics(activeWorkspaceId?: string | null) {
  return useQuery({
    queryKey: dashboardKeys.metrics(activeWorkspaceId),
    queryFn: () => getDashboardMetrics(activeWorkspaceId),
    staleTime: 1000 * 60 * 5,
    enabled: !!activeWorkspaceId,
  });
}

export function useDashboardRecentNotifications(activeWorkspaceId?: string | null) {
  return useQuery({
    queryKey: dashboardKeys.notifications(activeWorkspaceId),
    queryFn: async () => {
      try {
        const data = await api.get<
          DashboardRecentNotification[] | { results?: DashboardRecentNotification[] }
        >("/v1/dashboard/notifications/?page_size=5", {
          headers: activeWorkspaceId
            ? { "X-Workspace-ID": activeWorkspaceId }
            : undefined,
        });
        return Array.isArray(data) ? data : data.results ?? [];
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load recent notifications"));
      }
    },
    staleTime: 1000 * 60,
    enabled: !!activeWorkspaceId,
  });
}
