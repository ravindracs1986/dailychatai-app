"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ChatArea from "@/components/chat-area"
import AuthenticatedLayout from "@/components/authenticated-layout"
import ModelSelector from "@/components/model-selector"
import UpgradePlansModal from "@/components/upgrade-plans-modal"
import { useAuth, getStoredAccessToken } from "@/contexts/auth-context"
import type { ModelCategory, CategorizedModel } from "@/lib/model-categories"
import { API_CONFIG } from "@/lib/api-config"
import { CONFIG } from "@/config"
import {
  FileText,
  ImageIcon,
  UserPlus,
  Code,
} from "lucide-react"

interface Message {
  role: string
  content: string
  isImage?: boolean
  isError?: boolean
}

const LS_SELECTED_PROJECT_ID = "selected_project_id"

const welcomeCards = [
  { label: "Write copy", icon: FileText, prompt: "Write marketing copy for", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { label: "Image generation", icon: ImageIcon, prompt: "Generate an image of", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { label: "Create avatar", icon: UserPlus, prompt: "Create a profile avatar for", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { label: "Write code", icon: Code, prompt: "Write code for", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
]

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, accessToken, loading: authLoading, authEnabled } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [usageChecked, setUsageChecked] = useState(false)
  const [categorizedModels, setCategorizedModels] = useState<Record<ModelCategory, CategorizedModel[]>>({
    ultra: [],
    pro: [],
    fast: [],
    normal: [],
    slow: [],
  })
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedModelName, setSelectedModelName] = useState("")
  const [showModelSelector, setShowModelSelector] = useState(false)

  useEffect(() => {
    if (!authLoading && authEnabled && !user) {
      router.replace("/login")
    }
  }, [authLoading, authEnabled, user, router])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const headers: HeadersInit = {}
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`
    }

    fetch("/api/models/free", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.categorizedModels) return
        setCategorizedModels(data.categorizedModels)
        const categories: ModelCategory[] = ["ultra", "pro", "fast", "normal", "slow"]
        const limit = user.usage_limit ?? 10
        for (const category of categories) {
          const models = (data.categorizedModels[category] || []) as CategorizedModel[]
          // API already returns only free models, so we can show all of them
          // Legacy check for limit >= 100 is removed as we trust the DB is_free flag
          if (models.length > 0) {
            setSelectedModel(models[0].id)
            setSelectedModelName(models[0].name)
            break
          }
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id, user?.usage_limit, accessToken])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    fetch("/api/usage", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        setCanSend(data?.canSend !== false)
        setUsageChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setCanSend(true)
        setUsageChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId)
    const categories: ModelCategory[] = ["ultra", "pro", "fast", "normal", "slow"]
    for (const category of categories) {
      const model = categorizedModels[category]?.find((m) => m.id === modelId)
      if (model) {
        setSelectedModelName(model.name)
        break
      }
    }
  }, [categorizedModels])

  const loadConversationMessages = useCallback(async (convId: string) => {
    const token = getStoredAccessToken()
    if (!token) return
    const res = await fetch(`/api/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const list = (data.messages || []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }))
    setMessages(list)
  }, [])

  const handleSelectConversation = useCallback(
    (id: string | null) => {
      setConversationId(id)
      if (id) loadConversationMessages(id)
      else setMessages([])
    },
    [loadConversationMessages]
  )

  const handleNewChat = useCallback(() => {
    setConversationId(null)
    setMessages([])
    router.push("/chat")
  }, [router])

  useEffect(() => {
    const c = searchParams.get("c")
    if (c && c !== conversationId) {
      handleSelectConversation(c)
      return
    }
    if (!c && conversationId) {
      handleSelectConversation(null)
    }
  }, [searchParams, conversationId, handleSelectConversation])

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || !accessToken) return
    if (usageChecked && !canSend) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Daily message limit reached. Please try again after midnight UTC.",
          isError: true,
        },
      ])
      return
    }
    const newMessage: Message = { role: "user", content: userMessage }
    setMessages((prev) => [...prev, newMessage])
    setLoading(true)
    try {
      const res = await fetch(API_CONFIG.ENDPOINTS.CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId || undefined,
          model: selectedModel,
          projectId:
            (typeof window !== "undefined" ? localStorage.getItem(LS_SELECTED_PROJECT_ID) : null) ||
            undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const code = (data as { code?: string }).code
        if (res.status === 403 && code === "USAGE_LIMIT_REACHED") {
          setCanSend(false)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: (data as { error?: string }).error || "Daily message limit reached.",
              isError: true,
            },
          ])
          return
        }
        throw new Error((data as { error?: string }).error || `API error: ${res.status}`)
      }
      const content = (data as { content?: string }).content ?? "No response"
      const newConvId = (data as { conversationId?: string }).conversationId
      if (newConvId && !conversationId) {
        setConversationId(newConvId)
        router.replace(`/chat?c=${encodeURIComponent(newConvId)}`)
        window.dispatchEvent(new CustomEvent("conversations:changed"))
      }
      setMessages((prev) => [...prev, { role: "assistant", content }])
      fetch("/api/usage", { headers: { Authorization: `Bearer ${accessToken}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => {
          if (u && typeof u.canSend === "boolean") setCanSend(u.canSend)
        })
        .catch(() => {})
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  if (authLoading || (authEnabled && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!authEnabled || !user) {
    return null
  }

  const modelLabel = user.usage_limit === 100 ? "GPT-4 (Pro)" : user.usage_limit === 10 ? "GPT-3.5 (Free)" : "Model"

  return (
    <AuthenticatedLayout>
      {/* Full-width center layout */}
      <div className="flex-1 flex min-h-0 !bg-slate-50 dark:!bg-background">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading}
            inputDisabled={usageChecked && !canSend}
            inputDisabledMessage="Daily message limit reached. Please try again after midnight UTC."
            imageMode={false}
            selectedModelName={selectedModelName || (user?.usage_limit === 100 ? "GPT-4 (Pro)" : "GPT-3.5")}
            onModelClick={() => setShowModelSelector(true)}
            showChatBoxLayout
            customEmptyState={
              <div className="max-w-2xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold mb-2">Welcome to {CONFIG.site.name}</h2>
                <p className="text-muted-foreground text-lg mb-10">
                  Get started by typing a task and Chat can do the rest. Not sure where to start?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {welcomeCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => handleCardClick(card.prompt)}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium">{card.label}</span>
                        </div>
                        <span className="w-8 h-8 rounded-full border flex items-center justify-center text-lg group-hover:bg-muted">
                          +
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            }
          />
          <p className="text-xs text-muted-foreground text-center px-4 pb-2 shrink-0">
            {CONFIG.site.name} may generate inaccurate information. Model: {selectedModelName || modelLabel}
          </p>
        </main>
      </div>
      
      <UpgradePlansModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
      {showModelSelector && (
        <ModelSelector
          categorizedModels={categorizedModels}
          selectedModel={selectedModel}
          onSelectModel={handleModelChange}
          onClose={() => setShowModelSelector(false)}
        />
      )}
    </AuthenticatedLayout>
  )
}
