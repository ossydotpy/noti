export const apiKeyKeys = {
  all: ["api-keys"] as const,
  list: (workspace?: string) =>
    [...apiKeyKeys.all, "list", workspace].filter(Boolean) as string[],
  detail: (id: string) => [...apiKeyKeys.all, "detail", id] as const,
};
