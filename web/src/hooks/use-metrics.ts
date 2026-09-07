import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/lib/api/workspace-keys";
import { api } from "@/lib/auth/authFetch";
import type { DashboardMetrics } from "@/lib/types";
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
