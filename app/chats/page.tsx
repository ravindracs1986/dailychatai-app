"use client"

import { useCallback, useEffect, useRef, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, History, ArrowRight } from "lucide-react"

type ConversationRow = {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function AllChatsPage() {
  return (
    <Suspense fallback={null}>
      <AllChatsPageInner />
    </Suspense>
  )
}

function AllChatsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q, 250)

  const [rows, setRows] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const offset = rows.length
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const offsetRef = useRef(0)
  const skipNextUrlSyncRef = useRef(false)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const loadPage = useCallback(
    async (nextOffset: number, replace: boolean) => {
      if (typeof window === "undefined") return
      const token = localStorage.getItem("auth_access_token")
      if (!token) {
        setInitialLoading(false)
        return
      }
      if (loadingRef.current) return
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("limit", String(PAGE_SIZE))
        params.set("offset", String(nextOffset))
        if (debouncedQ.trim()) params.set("q", debouncedQ.trim())
        const res = await fetch(`/api/conversations?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || "Failed to load chats")

        const items: ConversationRow[] = Array.isArray(data?.conversations) ? data.conversations : []
        setRows((prev) => (replace ? items : [...prev, ...items]))
        setHasMore(items.length === PAGE_SIZE)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chats")
        setHasMore(false)
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [debouncedQ]
  )

  useEffect(() => {
    const urlQ = (searchParams?.get("q") || "").trim()
    setQ((prev) => {
      if (prev === urlQ) return prev
      skipNextUrlSyncRef.current = true
      return urlQ
    })
  }, [searchParams])

  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false
      return
    }
    const next = debouncedQ.trim()
    const qs = next ? `?q=${encodeURIComponent(next)}` : ""
    router.replace(`/chats${qs}`)
  }, [debouncedQ, router])

  useEffect(() => {
    setRows([])
    setHasMore(true)
    setInitialLoading(true)
    loadPage(0, true)
  }, [debouncedQ, loadPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      if (!hasMoreRef.current) return
      if (loadingRef.current) return
      loadPage(offsetRef.current, false)
    }, { root: null, rootMargin: "300px", threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadPage])

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto bg-muted/10">
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">All Chats</h1>
              <p className="text-muted-foreground mt-1">Search and open any previous conversation</p>
            </div>
            <Link href="/chat">
              <Button className="gap-2">
                New Chat <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by chat title…"
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {initialLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  No chats found.
                </div>
              ) : (
                rows.map((c) => (
                  <Link key={c.id} href={`/chat?c=${encodeURIComponent(c.id)}`} className="block">
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex items-center gap-3">
                        <History className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.title || "New Chat"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(c.updated_at || c.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {c.is_pinned ? (
                        <span className="text-xs text-primary font-medium">Pinned</span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}

              {error ? (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                  {error}
                </div>
              ) : null}

              <div ref={sentinelRef} />

              {loading && !initialLoading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more…
                </div>
              ) : null}

              {!hasMore && rows.length > 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">End of list</div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
