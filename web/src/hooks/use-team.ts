import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveWorkspaceId, getApiErrorMessage } from "@/hooks/use-workspaces";
import { api } from "@/lib/auth/authFetch";
import type { InviteInput, MemberRole, TeamInvite, TeamMember } from "@/lib/types";

export type { MemberRole, TeamMember, TeamInvite, InviteInput } from "@/lib/types";

export const teamKeys = {
  all: ["team"] as const,
  members: (workspaceId?: string) =>
    [...teamKeys.all, "members", workspaceId] as const,
  memberMe: (workspaceId?: string) =>
    [...teamKeys.all, "member-me", workspaceId] as const,
  invites: (workspaceId?: string) =>
    [...teamKeys.all, "invites", workspaceId] as const,
};

const STALE_TIME = 1000 * 60; // 1 minute
const GC_TIME = 1000 * 60 * 5; // 5 minutes

function unwrap<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : (data as { results?: T[] }).results || []) as T[];
}

export function useTeamMembers() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: teamKeys.members(workspaceId ?? undefined),
    queryFn: async () => {
      try {
        const data = await api.get<unknown>("/v1/dashboard/team/members/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
        return unwrap<TeamMember>(data);
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load team members"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTeamMemberMe() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: teamKeys.memberMe(workspaceId ?? undefined),
    queryFn: async () => {
      try {
        return await api.get<TeamMember>("/v1/dashboard/team/members/me/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load your membership"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useTeamInvites() {
  const { workspaceId } = useActiveWorkspaceId();

  return useQuery({
    queryKey: teamKeys.invites(workspaceId ?? undefined),
    queryFn: async () => {
      try {
        const data = await api.get<unknown>("/v1/dashboard/team/invites/", {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
        return unwrap<TeamInvite>(data);
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load invitations"));
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useInviteMember() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteInput) => {
      try {
        return await api.post("/v1/dashboard/team/invites/", input, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to send invitation"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.invites(workspaceId ?? undefined),
      });
      toast.success("Invitation sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRevokeInvite() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      try {
        await api.delete(`/v1/dashboard/team/invites/${inviteId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to revoke invitation"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.invites(workspaceId ?? undefined),
      });
      toast.success("Invitation revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMemberRole() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: MemberRole;
    }) => {
      try {
        return await api.patch(`/v1/dashboard/team/members/${memberId}/`, { role }, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update role"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.members(workspaceId ?? undefined),
      });
      queryClient.invalidateQueries({
        queryKey: teamKeys.memberMe(workspaceId ?? undefined),
      });
      toast.success("Role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveMember() {
  const { workspaceId } = useActiveWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      try {
        await api.delete(`/v1/dashboard/team/members/${memberId}/`, {
          headers: { "X-Workspace-ID": workspaceId as string },
        });
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to remove member"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.members(workspaceId ?? undefined),
      });
      toast.success("Member removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
