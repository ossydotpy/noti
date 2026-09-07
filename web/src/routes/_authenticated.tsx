import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await context.auth.ready
    if (context.auth.status !== "authenticated") {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
  },
  component: () => <Outlet />,
})
