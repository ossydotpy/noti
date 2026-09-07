import { clearTokens, getAccessToken, getTokens, setTokens } from "./tokens"

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(
  /\/$/,
  "",
)

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, payload: unknown) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error?: { message?: string } }).error?.message === "string"
        ? (payload as { error: { message: string } }).error.message
        : `Request failed with status ${status}`
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }

  /** Field-level error message from a DRF-style validation payload. */
  get fieldError(): string | undefined {
    const detail = (this.payload as { detail?: string })?.detail
    if (detail) return detail
    const errors = (this.payload as Record<string, unknown>) ?? {}
    for (const value of Object.values(errors)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0]
      if (typeof value === "string") return value
    }
    return undefined
  }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  const { refresh } = getTokens()
  if (!refresh) return false

  const response = await fetch(`${API_URL}/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    if (response.status === 401) clearTokens()
    return false
  }

  const data = (await response.json()) as { access: string; refresh?: string }
  setTokens({
    access: data.access,
    refresh: data.refresh ?? refresh,
  })
  return true
}

/** Single-flight token refresh: concurrent 401s share one refresh request. */
export function ensureFreshAccessToken(): Promise<boolean> {
  refreshPromise ??= refreshTokens().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  }

  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (response.status === 401 && !retried && token) {
    const refreshed = await ensureFreshAccessToken()
    if (refreshed) return request<T>(path, init, true)
  }

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new ApiError(response.status, payload)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function jsonBody(body: unknown, init?: RequestInit): RequestInit {
  return { ...init, method: "POST", body: JSON.stringify(body) }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, jsonBody(body, init)),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }),
}
