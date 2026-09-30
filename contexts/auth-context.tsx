"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  profile_pic_url: string | null
  plan_id: string | null
  role: "user" | "admin"
  usage_limit: number
  usage_today: number
  email_verified_at: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  authEnabled: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ error?: string; code?: string }>
  register: (username: string, email: string, password: string, profile_pic_url?: string | null) => Promise<{ error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  setUser: (u: AuthUser | null) => void
  setTokens: (access: string | null, refresh: string | null) => void
}

const STORAGE_ACCESS = "auth_access_token"
const STORAGE_REFRESH = "auth_refresh_token"
const STORAGE_USER = "auth_user"

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
    authEnabled: false,
  })

  const refreshSession = useCallback(async () => {
    const refresh = typeof window !== "undefined" ? localStorage.getItem(STORAGE_REFRESH) : null
    if (!refresh) return false

    try {
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${refresh}` },
      })
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        const tok = data.accessToken
        const ref = data.refreshToken
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_ACCESS, tok)
          localStorage.setItem(STORAGE_REFRESH, ref)
          localStorage.setItem(STORAGE_USER, JSON.stringify(data.user))
        }
        setState((s) => ({
          ...s,
          user: data.user,
          accessToken: tok,
          refreshToken: ref,
          loading: false,
          authEnabled: true,
        }))
        return true
      } else if (refreshRes.status === 401) {
        // Refresh token invalid/expired
        return false
      }
    } catch (_) {}
    return false
  }, [])

  const refreshUser = useCallback(async () => {
    const access = typeof window !== "undefined" ? localStorage.getItem(STORAGE_ACCESS) : null
    if (!access) {
      setState((s) => ({ ...s, user: null, accessToken: null, refreshToken: null, loading: false }))
      return
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${access}` },
      })
      if (res.status === 503) {
        setState((s) => ({ ...s, loading: false, authEnabled: false }))
        return
      }
      if (res.ok) {
        const data = await res.json()
        setState((s) => ({
          ...s,
          user: data.user,
          accessToken: access,
          refreshToken: localStorage.getItem(STORAGE_REFRESH),
          loading: false,
          authEnabled: true,
        }))
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_USER, JSON.stringify(data.user))
        }
        return
      }
      const refresh = typeof window !== "undefined" ? localStorage.getItem(STORAGE_REFRESH) : null
      if (res.status === 401 && refresh) {
        const success = await refreshSession()
        if (success) return
      }
    } catch (_) {}
    setState((s) => ({
      ...s,
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      authEnabled: state.authEnabled,
    }))
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_ACCESS)
      localStorage.removeItem(STORAGE_REFRESH)
      localStorage.removeItem(STORAGE_USER)
    }
  }, [state.authEnabled])

  useEffect(() => {
    const access = typeof window !== "undefined" ? localStorage.getItem(STORAGE_ACCESS) : null
    const userStr = typeof window !== "undefined" ? localStorage.getItem(STORAGE_USER) : null
    if (access && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser
        setState((s) => ({
          ...s,
          user,
          accessToken: access,
          refreshToken: localStorage.getItem(STORAGE_REFRESH),
          loading: false,
          authEnabled: true,
        }))
        refreshUser()
        return
      } catch (_) {}
    }

    if (!access) {
      const refresh = typeof window !== "undefined" ? localStorage.getItem(STORAGE_REFRESH) : null
      if (refresh) {
        refreshSession().then((success) => {
          if (!success) setState((s) => ({ ...s, loading: false }))
        })
        return
      }
      setState((s) => ({ ...s, loading: false }))
      return
    }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${access}` } })
      .then((res) => {
        if (res.status === 503) {
          setState((s) => ({ ...s, loading: false, authEnabled: false }))
          return
        }
        if (res.ok) return res.json().then((data) => ({ user: data.user }))
        return Promise.resolve(null)
      })
      .then((data) => {
        if (data?.user) {
          setState((s) => ({
            ...s,
            user: data.user,
            accessToken: access,
            refreshToken: typeof window !== "undefined" ? localStorage.getItem(STORAGE_REFRESH) : null,
            loading: false,
            authEnabled: true,
          }))
        } else {
          setState((s) => ({ ...s, loading: false, authEnabled: !!access }))
        }
      })
      .catch(() => setState((s) => ({ ...s, loading: false })))
  }, [refreshUser])

  // Setup silent refresh
  useEffect(() => {
    if (!state.accessToken) return

    try {
      // Decode JWT to find expiry
      const parts = state.accessToken.split(".")
      if (parts.length !== 3) return
      
      const payload = JSON.parse(atob(parts[1]))
      if (!payload.exp) return

      const expTime = payload.exp * 1000
      const currentTime = Date.now()
      const timeUntilExpiry = expTime - currentTime
      
      // Refresh 1 minute before expiry
      // If token is already expired or close to it (less than 1 min), refresh immediately
      const refreshDelay = Math.max(0, timeUntilExpiry - 60000)
      
      // If delay is very large (e.g. > 1 day), verify it's reasonable, but JWT exp should be correct.
      // 15 mins = 900000ms.
      
      const timeoutId = setTimeout(async () => {
        const success = await refreshSession()
        // If silent refresh fails (e.g. network), we don't log out immediately.
        // The user will hit a 401 on next action and might trigger refreshUser then, or fail.
        // But this loop ensures we try.
      }, refreshDelay)

      return () => clearTimeout(timeoutId)
    } catch (error) {
      console.error("Error setting up token refresh:", error)
    }
  }, [state.accessToken, refreshSession])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { 
        error: (data as { error?: string }).error || "Login failed",
        code: (data as { code?: string }).code
      }
    }
    const tok = (data as { accessToken?: string }).accessToken
    const ref = (data as { refreshToken?: string }).refreshToken
    const user = (data as { user?: AuthUser }).user
    if (tok && user && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_ACCESS, tok)
      localStorage.setItem(STORAGE_REFRESH, ref || "")
      localStorage.setItem(STORAGE_USER, JSON.stringify(user))
    }
    setState((s) => ({
      ...s,
      user: user ?? null,
      accessToken: tok ?? null,
      refreshToken: ref ?? null,
      authEnabled: true,
    }))
    return {}
  }, [])

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      profile_pic_url?: string | null
    ) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, profile_pic_url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { error: (data as { error?: string }).error || "Registration failed" }
      const tok = (data as { accessToken?: string }).accessToken
      const ref = (data as { refreshToken?: string }).refreshToken
      const user = (data as { user?: AuthUser }).user
      if (tok && user && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_ACCESS, tok)
        localStorage.setItem(STORAGE_REFRESH, ref || "")
        localStorage.setItem(STORAGE_USER, JSON.stringify(user))
      }
      setState((s) => ({
        ...s,
        user: user ?? null,
        accessToken: tok ?? null,
        refreshToken: ref ?? null,
        authEnabled: true,
      }))
      return {}
    },
    []
  )

  const logout = useCallback(() => {
    setState((s) => ({
      ...s,
      user: null,
      accessToken: null,
      refreshToken: null,
    }))
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_ACCESS)
      localStorage.removeItem(STORAGE_REFRESH)
      localStorage.removeItem(STORAGE_USER)
    }
  }, [])

  const setUser = useCallback((u: AuthUser | null) => {
    setState((s) => ({ ...s, user: u }))
    if (typeof window !== "undefined" && u) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    }
  }, [])

  const setTokens = useCallback((access: string | null, refresh: string | null) => {
    setState((s) => ({ ...s, accessToken: access, refreshToken: refresh }))
    if (typeof window !== "undefined") {
      if (access) localStorage.setItem(STORAGE_ACCESS, access)
      else localStorage.removeItem(STORAGE_ACCESS)
      if (refresh) localStorage.setItem(STORAGE_REFRESH, refresh)
      else localStorage.removeItem(STORAGE_REFRESH)
    }
  }, [])

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    setUser,
    setTokens,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_ACCESS)
}
