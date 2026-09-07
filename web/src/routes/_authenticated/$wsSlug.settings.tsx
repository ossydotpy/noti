import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/$wsSlug/settings")({
  component: WorkspaceSettingsPage,
});

function WorkspaceSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-4">Manage your account, {user?.first_name || user?.email}</p>
    </div>
  );
}
