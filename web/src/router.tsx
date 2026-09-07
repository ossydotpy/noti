import { createRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { auth } from "./lib/auth"

export interface RouterContext {
  queryClient: QueryClient
  auth: typeof auth
}

export function getRouter() {
  const queryClient = createQueryClient()

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    context: {
      queryClient,
      auth,
    },
  })

  return router
}
