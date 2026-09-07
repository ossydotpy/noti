export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
};

/** Metrics query key, mirroring the legacy dashboard key shape. */
export const dashboardKeys = {
  metrics: (workspaceId?: string | null) =>
    ["dashboard", "metrics", workspaceId] as const,
  notifications: (workspaceId?: string | null) =>
    ["dashboard", "notifications", workspaceId] as const,
  auditLogs: (workspaceId?: string | null) =>
    ["dashboard", "audit-logs", workspaceId] as const,
};
