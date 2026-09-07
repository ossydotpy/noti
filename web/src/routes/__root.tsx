import type { ReactNode } from "react"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { Toaster } from "sonner"

import type { RouterContext } from "@/router"
import { ThemeProvider, themeInitScript } from "@/hooks/use-theme"
import { queryPersistOptions } from "@/lib/query"
import "@/styles.css"

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "noti | Open-source notification platform" },
    ],
    links: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={queryPersistOptions}
      >
        <RootDocument>
          <Outlet />
          <Toaster richColors position="top-right" />
        </RootDocument>
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
