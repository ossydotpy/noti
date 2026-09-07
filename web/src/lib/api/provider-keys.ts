export const providerKeys = {
  all: ["providers"] as const,
  list: (workspace?: string) => {
    const keys = [...providerKeys.all, "list", workspace].filter(Boolean);
    return keys as string[];
  },
  detail: (id: string) => [...providerKeys.all, "detail", id] as const,
  availableTypes: () => [...providerKeys.all, "available-types"] as const,
};
