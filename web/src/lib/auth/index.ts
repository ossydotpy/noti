import { useSyncExternalStore } from "react"
import { api, ApiError } from "./authFetch"
import { clearTokens, getTokens, setTokens } from "./tokens"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  date_joined: string
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export interface SignUpInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
}

interface TokenResponse {
  access: string
  refresh: string
  user: User
}

interface AuthState {
  status: AuthStatus
  user: User | null
  ready: Promise<void>
  signUp: (input: SignUpInput) => Promise<User>
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
}

type Listener = () => void

let state: { status: AuthStatus; user: User | null } = {
  status: "loading",
  user: null,
}

const listeners = new Set<Listener>()

let readyResolve: (() => void) | undefined
const ready = new Promise<void>((resolve) => {
  readyResolve = resolve
})

function setState(next: Partial<{ status: AuthStatus; user: User | null }>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function applyTokens(data: TokenResponse) {
  setTokens({ access: data.access, refresh: data.refresh })
  setState({ status: "authenticated", user: data.user })
}

async function hydrate(): Promise<void> {
  const { access, refresh } = getTokens()
  if (!access && !refresh) {
    setState({ status: "unauthenticated", user: null })
    readyResolve?.()
    return
  }
  try {
    const user = await api.get<User>("/v1/auth/me/")
    setState({ status: "authenticated", user })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setState({ status: "unauthenticated", user: null })
      clearTokens()
    } else {
      // Offline / backend down: treat existing token as still valid.
      setState({ status: access ? "authenticated" : "unauthenticated", user: null })
    }
  }
  readyResolve?.()
}

if (typeof window !== "undefined") {
  void hydrate()
}

export const auth: AuthState = {
  get status() {
    return state.status
  },
  get user() {
    return state.user
  },
  ready,
  async signUp(input) {
    const data = await api.post<TokenResponse>("/v1/auth/register/", input)
    applyTokens(data)
    return data.user
  },
  async signIn(email, password) {
    const data = await api.post<TokenResponse>("/v1/auth/token/", { email, password })
    applyTokens(data)
    return data.user
  },
  async signOut() {
    const { refresh } = getTokens()
    try {
      if (refresh) await api.post("/v1/auth/logout/", { refresh })
    } catch {
      // Best-effort: always clear local state.
    }
    clearTokens()
    setState({ status: "unauthenticated", user: null })
  },
}

function getSnapshot() {
  return state
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuth(): { status: AuthStatus; user: User | null } {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useUser(): User | null {
  return useAuth().user
}
