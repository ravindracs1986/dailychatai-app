"use client"

import { useEffect, useMemo, useState } from "react"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Cpu, RefreshCw, Search } from "lucide-react"

type LocalModel = {
  id: string
  name: string
  context_length: number
  is_active?: boolean
}

type UserRow = {
  id: string
  username: string
  email: string
  role: string
  local_llm_enabled: number
}

export default function AdminLocalLlmPage() {
  const { accessToken } = useAuth()
  const [modelsLoading, setModelsLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [localActive, setLocalActive] = useState(false)
  const [models, setModels] = useState<LocalModel[]>([])
  const [syncingModels, setSyncingModels] = useState(false)

  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [users, setUsers] = useState<UserRow[]>([])

  const fetchModels = async () => {
    if (!accessToken) return
    setModelsLoading(true)
    try {
      const res = await fetch("/api/admin/local-llm/models", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setLocalActive(!!data.active)
      setModels(Array.isArray(data.models) ? data.models : [])
    } catch (e) {
      toast.error("Failed to fetch local models")
    } finally {
      setModelsLoading(false)
    }
  }

  const syncModels = async () => {
    if (!accessToken) return
    setSyncingModels(true)
    try {
      const res = await fetch("/api/admin/local-llm/models/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.success) toast.success(data.message || "Synced local models")
      else toast.error(data.error || "Sync failed")
    } catch (e) {
      toast.error("Sync failed")
    } finally {
      setSyncingModels(false)
      fetchModels()
    }
  }

  const updateModel = async (id: string, enabled: boolean) => {
    if (!accessToken) return
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: enabled } : m)))
    try {
      const res = await fetch(`/api/admin/local-llm/models/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ is_active: enabled }),
      })
      if (!res.ok) throw new Error("Failed")
    } catch (e) {
      toast.error("Failed to update model")
      fetchModels()
    }
  }

  const fetchUsers = async () => {
    if (!accessToken) return
    setUsersLoading(true)
    try {
      const qs = new URLSearchParams()
      if (q.trim()) qs.set("q", q.trim())
      qs.set("page", String(page))
      qs.set("limit", String(limit))

      const res = await fetch(`/api/admin/local-llm/users?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
      setTotalPages(Number(data?.pagination?.totalPages || 1))
    } catch (e) {
      toast.error("Failed to fetch users")
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    fetchModels()
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, page])

  const filteredUsers = useMemo(() => {
    // client-side filter to avoid refetch on every keystroke
    const term = q.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) => u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  }, [users, q])

  const updateUser = async (id: string, enabled: boolean) => {
    if (!accessToken) return
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, local_llm_enabled: enabled ? 1 : 0 } : u)))
    try {
      const res = await fetch(`/api/admin/local-llm/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ local_llm_enabled: enabled }),
      })
      if (!res.ok) throw new Error("Failed")
    } catch (e) {
      toast.error("Failed to update user")
      fetchUsers()
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Local LLM Control</h1>
                <p className="text-muted-foreground mt-1">
                  Fetch Local LLM models and control who can see them in chat
                </p>
              </div>
            </div>
            <Button onClick={() => { fetchModels(); fetchUsers(); }} className="gap-2" disabled={modelsLoading || usersLoading}>
              <RefreshCw className={`w-4 h-4 ${(modelsLoading || usersLoading) ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Local LLM status</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Controlled by `LOCAL_LLM_ENABLED` + `LLM_BASE_URL`
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    localActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {localActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4">
                {modelsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading models…</div>
                ) : !localActive ? (
                  <div className="text-sm text-muted-foreground">
                    Local LLM is not active. Enable `LOCAL_LLM_ENABLED=true` and set `LLM_BASE_URL`.
                  </div>
                ) : models.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No models in DB yet. Click <span className="font-medium">Sync Local Models</span> to fetch from VPS and store in `local_models`.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {models.map((m) => (
                      <div key={m.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{m.id}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-xs text-muted-foreground">
                            ctx {Number(m.context_length || 0).toLocaleString()}
                          </div>
                          <Switch
                            checked={m.is_active !== false}
                            onCheckedChange={(checked) => updateModel(m.id, checked)}
                            disabled={!localActive}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={syncModels} disabled={!localActive || syncingModels} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${syncingModels ? "animate-spin" : ""}`} />
                  {syncingModels ? "Syncing..." : "Sync Local Models"}
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium">Who can use Local LLM?</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Toggles `users.local_llm_enabled` (show/hide local models in chat)
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Page {page} / {totalPages}
                </div>
              </div>

              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by username or email..."
                  className="pl-9"
                />
              </div>

              {usersLoading ? (
                <div className="text-sm text-muted-foreground">Loading users…</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{u.username}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{u.role}</span>
                        <Switch
                          checked={Number(u.local_llm_enabled) === 1}
                          onCheckedChange={(checked) => updateUser(u.id, checked)}
                          disabled={!localActive}
                        />
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-sm text-muted-foreground">No users found.</div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

