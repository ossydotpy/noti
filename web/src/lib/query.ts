import { QueryClient } from "@tanstack/react-query"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

export const QUERY_CACHE_KEY = "noti.queryCache"
const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24
const QUERY_CACHE_BUSTER = "noti-v1"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let activeClient: QueryClient | null = null

export function setActiveQueryClient(client: QueryClient) {
  activeClient = client
}

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

/** localStorage persister for the QueryClient (no-op shim during prerender). */
export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : memoryStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
})

export const queryPersistOptions = {
  persister: queryPersister,
  maxAge: QUERY_CACHE_MAX_AGE,
  buster: QUERY_CACHE_BUSTER,
}

/**
 * Clears the persisted query cache and the in-memory client — used on sign-out
 * so one account's shell data never leaks into another's.
 */
export function purgeQueryCache() {
  activeClient?.clear()
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(QUERY_CACHE_KEY)
  }
}
