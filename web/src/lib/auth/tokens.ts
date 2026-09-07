const ACCESS_KEY = "noti.access"
const REFRESH_KEY = "noti.refresh"

export interface Tokens {
  access: string | null
  refresh: string | null
}

const hasWindow = () => typeof window !== "undefined"

export function getTokens(): Tokens {
  if (!hasWindow()) return { access: null, refresh: null }
  return {
    access: window.localStorage.getItem(ACCESS_KEY),
    refresh: window.localStorage.getItem(REFRESH_KEY),
  }
}

export function setTokens(tokens: Tokens): void {
  if (!hasWindow()) return
  if (tokens.access) window.localStorage.setItem(ACCESS_KEY, tokens.access)
  else window.localStorage.removeItem(ACCESS_KEY)
  if (tokens.refresh) window.localStorage.setItem(REFRESH_KEY, tokens.refresh)
  else window.localStorage.removeItem(REFRESH_KEY)
}

export function clearTokens(): void {
  if (!hasWindow()) return
  window.localStorage.removeItem(ACCESS_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

export function getAccessToken(): string | null {
  return getTokens().access
}
