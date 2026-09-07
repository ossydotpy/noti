import * as React from "react";
import { useParams, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/auth/authFetch";
import { workspaceKeys } from "@/lib/api/workspace-keys";
import type { Workspace, WorkspaceCreate } from "@/lib/types";
import { extractFirstError } from "@/lib/api-utils";
import { getWorkspaceDashboardPath } from "@/lib/routes";

export function extractWorkspaces(data: unknown): Workspace[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Workspace[];
  const results = (data as { results?: Workspace[] }).results;
  return results ?? [];
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return extractFirstError(error.payload, error.message);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

interface UseWorkspacesOptions {
  initialActiveWorkspace?: Workspace | null;
}

export function useWorkspaces(options: UseWorkspacesOptions = {}) {
  const { initialActiveWorkspace } = options;
  const router = useRouter();
  const params = useParams({ strict: false }) as { wsSlug?: string } | undefined;
  const wsSlug =
    params && typeof params.wsSlug === "string" ? params.wsSlug : null;
  const pathname = router.latestLocation.pathname;

  const query = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      try {
        return await api.get<unknown>("/v1/dashboard/workspaces/");
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load workspaces"));
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 1000 * 60 * 5,
  });

  const workspaces = React.useMemo<Workspace[]>(
    () => extractWorkspaces(query.data),
    [query.data]
  );

  const activeWorkspace = React.useMemo(() => {
    if (initialActiveWorkspace && wsSlug === initialActiveWorkspace.slug) {
      return initialActiveWorkspace;
    }
    if (workspaces.length === 0 || !wsSlug) return null;
    return (
      workspaces.find((workspace) => workspace.slug === wsSlug) ?? null
    );
  }, [workspaces, wsSlug, initialActiveWorkspace]);

  const switchWorkspace = React.useCallback(
    (slug: string) => {
      router.history.push(getWorkspaceDashboardPath(slug, pathname));
    },
    [pathname, router.history]
  );

  return {
    ...query,
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id ?? null,
    switchWorkspace,
  };
}

/**
 * Resolves the active workspace from the current route param (`wsSlug`) and
 * the workspaces query cache. Every workspace-scoped request should send the
 * returned id as the `X-Workspace-ID` header.
 */
export function useActiveWorkspaceId() {
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { wsSlug?: string } | undefined;
  const wsSlug =
    params && typeof params.wsSlug === "string" ? params.wsSlug : null;

  const cached = queryClient.getQueryData<unknown>(workspaceKeys.list());
  const cachedWorkspaces = React.useMemo(
    () => extractWorkspaces(cached),
    [cached]
  );

  const { workspaces } = useWorkspaces();
  const list = cachedWorkspaces.length ? cachedWorkspaces : workspaces;

  return React.useMemo(() => {
    const workspace = wsSlug
      ? (list.find((w) => w.slug === wsSlug) ?? undefined)
      : undefined;
    return { workspaceId: workspace?.id, workspace };
  }, [wsSlug, list]);
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: WorkspaceCreate) => {
      try {
        return await api.post<Workspace>("/v1/dashboard/workspaces/", payload);
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create workspace"));
      }
    },
    onSuccess: (workspace: Workspace) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      router.history.push(getWorkspaceDashboardPath(workspace.slug));
    },
  });
}
