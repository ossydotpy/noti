export const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  providers: "Providers",
  sms: "SMS",
  push: "Push",
  "in-app": "In-App",
  topics: "Topics",
  "api-keys": "API Keys",
  settings: "Settings",
  security: "Security",
  overview: "Overview",
};

export type BreadcrumbItem = { href?: string; label: string };

export function isDashboardPath(pathname?: string | null): boolean {
  const parts = pathname?.split("/").filter(Boolean) ?? [];
  return parts[0] === "dashboard" || parts[1] === "dashboard";
}

export function getDashboardPathname(pathname?: string | null): string {
  const parts = pathname?.split("/").filter(Boolean) ?? [];
  const dashboardIndex = parts.indexOf("dashboard");

  if (dashboardIndex === -1) {
    return "/dashboard";
  }

  return `/${parts.slice(dashboardIndex).join("/")}`;
}

export function getDashboardBasePath(wsSlug?: string | null): string {
  return wsSlug ? `/${wsSlug}/dashboard` : "/dashboard";
}

export function getWorkspaceProvidersPath(wsSlug: string): string {
  return `/${wsSlug}/providers`;
}

export function getWorkspaceDashboardPath(
  wsSlug: string,
  pathname: string = "/dashboard"
): string {
  const dashboardPath = getDashboardPathname(pathname);
  return `/${wsSlug}${dashboardPath === "/" ? "" : dashboardPath}`;
}

export function buildBreadcrumbItems(pathname?: string | null): BreadcrumbItem[] {
  const parts = pathname?.split("/").filter(Boolean) ?? [];
  const dashboardIndex = parts.indexOf("dashboard");

  if (!parts.length) {
    return [{ label: "Overview" }];
  }

  const items: BreadcrumbItem[] = [];

  if (dashboardIndex !== -1) {
    const wsSlug = dashboardIndex > 0 ? parts[dashboardIndex - 1] : null;
    const dashboardHref = wsSlug
      ? getWorkspaceDashboardPath(wsSlug)
      : "/dashboard";

    items.push({ href: dashboardHref, label: labelMap.dashboard ?? "Dashboard" });

    if (parts.length === dashboardIndex + 1) {
      items.push({ label: labelMap.overview ?? "Overview" });
      return items;
    }

    let acc = dashboardHref;
    for (let i = dashboardIndex + 1; i < parts.length; i++) {
      const part = parts[i];
      acc += `/${part}`;
      const isLast = i === parts.length - 1;
      const label =
        labelMap[part] ??
        part.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      if (isLast) {
        items.push({ label });
      } else {
        items.push({ href: acc, label });
      }
    }

    return items;
  }

  const last = parts[parts.length - 1];
  return [{ label: labelMap[last] ?? last }];
}
