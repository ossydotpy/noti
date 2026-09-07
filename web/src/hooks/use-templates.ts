import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { api } from "@/lib/auth/authFetch";
import type {
  CreateTemplateInput,
  Template,
  TemplateChannel,
  TemplateContent,
  UpdateTemplateInput,
} from "@/lib/types";

export type {
  TemplateChannel,
  TemplateContent,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/lib/types";

const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 10; // 10 minutes

function unwrap<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : (data as { results?: T[] }).results || []) as T[];
}

export function useTemplates() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["templates", "list", workspaceId],
    queryFn: async () => {
      try {
        const data = await api.get<unknown>(
          "/v1/dashboard/templates/?is_active=true",
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
        return unwrap<Template>(data);
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load templates"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTemplate(templateId: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["templates", "detail", templateId],
    queryFn: async () => {
      try {
        return await api.get<Template>(
          `/v1/dashboard/templates/${templateId}/`,
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load template"));
      }
    },
    enabled: !!workspaceId && !!templateId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      try {
        return await api.post<Template>("/v1/dashboard/templates/", input, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create template"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", "list", workspaceId],
      });
    },
  });
}

export function useUpdateTemplate(templateId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      try {
        return await api.patch<Template>(
          `/v1/dashboard/templates/${templateId}/`,
          input,
          { headers: { "X-Workspace-ID": workspaceId as string } }
        );
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update template"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", "list", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["templates", "detail", templateId],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { workspaceId } = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (templateId: string) => {
      try {
        await api.delete(`/v1/dashboard/templates/${templateId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete template"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", "list", workspaceId],
      });
    },
  });
}

export function useTemplateVersions(templateName: string | undefined) {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: ["templates", "versions", templateName, workspaceId],
    queryFn: async () => {
      if (!templateName || !workspaceId) return [];
      try {
        const data = await api.get<unknown>(
          `/v1/dashboard/templates/?name=${encodeURIComponent(templateName)}`,
          { headers: { "X-Workspace-ID": workspaceId } }
        );
        return unwrap<Template>(data);
      } catch {
        return [];
      }
    },
    enabled: !!workspaceId && !!templateName,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}
