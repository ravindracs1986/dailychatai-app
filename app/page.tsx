"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ChatArea from "@/components/chat-area"
import ThemeProvider from "@/components/theme-provider"
import ModelSelector from "@/components/model-selector"
import ConversationSidebar from "@/components/conversation-sidebar"
import { API_CONFIG } from "@/lib/api-config"
import { useAuth, getStoredAccessToken } from "@/contexts/auth-context"
import type { ModelCategory, CategorizedModel } from "@/lib/model-categories"

interface Message {
  role: string
  content: string
  isImage?: boolean
  isError?: boolean
}

export default function Home() {
  const { user, accessToken, loading: authLoading, authEnabled } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const [categorizedModels, setCategorizedModels] = useState<Record<ModelCategory, CategorizedModel[]>>({
    ultra: [],
    pro: [],
    fast: [],
    normal: [],
    slow: [],
  })
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedModelName, setSelectedModelName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiKeySet, setApiKeySet] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageMode, setImageMode] = useState(false)
  const [theme, setTheme] = useState("light")
  const [hasImageModel, setHasImageModel] = useState(false)
  const [devFeatures, setDevFeatures] = useState({
    allowUserApiKeys: false,
    allowCustomModels: true,
    imageGenerationEnabled: true,
  })
  const [devLoaded, setDevLoaded] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/developer")
        const data = await res.json()
        setDevFeatures(data.features || devFeatures)
        if ((data.hasApiKeys && data.defaultApiKey) || data.localLlmActive) {
          setApiKey("")
          localStorage.removeItem(API_CONFIG.STORAGE_KEYS.API_KEY)
          setApiKeySet(true)
          fetchModels()
        } else {
          const savedKey = localStorage.getItem(API_CONFIG.STORAGE_KEYS.API_KEY)
          if (savedKey && (data.features?.allowUserApiKeys ?? false)) {
            setApiKey(savedKey)
            setApiKeySet(true)
            fetchModels()
          }
        }
        setDevLoaded(true)
      } catch (e) {
        console.error("Failed to fetch developer config:", e)
        setDevLoaded(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem(API_CONFIG.STORAGE_KEYS.THEME) || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
  }, [])

  const router = useRouter()
  useEffect(() => {
    if (authEnabled && user) router.replace("/chat")
  }, [authEnabled, user, router])

  const fetchModels = useCallback(async () => {
    try {
      const headers: HeadersInit = {}
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      }
      const response = await fetch("/api/models/free", { headers })
      const data = await response.json()
      if (data.categorizedModels) {
        setCategorizedModels(data.categorizedModels)
        const categories: ModelCategory[] = ["ultra", "pro", "fast", "normal", "slow"]
        for (const category of categories) {
          const models = data.categorizedModels[category]
          if (models?.length > 0) {
            setSelectedModel(models[0].id)
            setSelectedModelName(models[0].name)
            break
          }
        }
        const hasImage = data.models?.some((m: { provider: string }) => m.provider === "vision")
        setHasImageModel(hasImage && (devFeatures.imageGenerationEnabled ?? true))
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
    }
  }, [devFeatures.imageGenerationEnabled, accessToken])

  const handleSetApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.API_KEY, key)
    setApiKeySet(true)
    fetchModels()
  }

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
      if (id) {
        loadConversationMessages(id)
      } else {
        setMessages([])
      }
    },
    [loadConversationMessages]
  )

  const handleNewChat = useCallback(() => {
    setConversationId(null)
    setMessages([])
  }, [])

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return

    if (authEnabled && user && accessToken) {
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
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || `API error: ${res.status}`)
        }
        const content = (data as { content?: string }).content ?? "No response"
        const newConvId = (data as { conversationId?: string }).conversationId
        if (newConvId && !conversationId) {
          setConversationId(newConvId)
          setSidebarRefresh((n) => n + 1)
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content },
        ])
      } catch (err) {
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setLoading(false)
      }
      return
    }

    if (!apiKeySet || !selectedModel) return
    const newMessage: Message = { role: "user", content: userMessage }
    setMessages((prev) => [...prev, newMessage])
    setLoading(true)
    try {
      const endpoint = imageMode ? API_CONFIG.ENDPOINTS.IMAGE : API_CONFIG.ENDPOINTS.CHAT
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model: selectedModel,
          message: userMessage,
          messages: imageMode ? [] : messages.concat(newMessage),
        }),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, isImage: imageMode },
      ])
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    const categories: ModelCategory[] = ["ultra", "pro", "fast", "normal", "slow"]
    for (const category of categories) {
      const model = categorizedModels[category]?.find((m) => m.id === modelId)
      if (model) {
        setSelectedModelName(model.name)
        break
      }
    }
  }

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.THEME, newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const showLegacyApiKeyFlow = !authEnabled && (!apiKeySet || devFeatures.allowUserApiKeys)
  const needApiKey = !authEnabled && !apiKeySet && !devFeatures.allowUserApiKeys
  const showChat =
    (authEnabled && user) || (authEnabled && !user && !devLoaded) ? false : authEnabled ? false : apiKeySet || (devFeatures.allowUserApiKeys && !apiKeySet)

  if (!devLoaded || authLoading) {
    return null
  }

  if (authEnabled && !user) {
    return (
      <ThemeProvider theme={theme}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border/50 shadow-xl text-center">
            <h1 className="text-2xl font-bold mb-2">AI Chat</h1>
            <p className="text-muted-foreground mb-6">Sign in to save conversations and use your plan.</p>
            <div className="flex flex-col gap-3">
              <Link href="/login">
                <Button className="w-full">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full">Create account</Button>
              </Link>
            </div>
          </Card>
        </div>
      </ThemeProvider>
    )
  }

  if (!authEnabled && needApiKey) {
    return (
      <ThemeProvider theme={theme}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border/50 shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">AI Chat</h1>
              <p className="text-muted-foreground">Powered by dailychatai-app</p>
            </div>
            <p className="text-muted-foreground mb-6 text-center">
              No API keys configured. Please configure API keys in the developer settings.
            </p>
            <a href="/docs" className="w-full">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                View Documentation
              </Button>
            </a>
          </Card>
        </div>
      </ThemeProvider>
    )
  }

  if (!authEnabled && !apiKeySet && devFeatures.allowUserApiKeys) {
    return (
      <ThemeProvider theme={theme}>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border/50 shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">AI Chat</h1>
              <p className="text-muted-foreground">Powered by Ravindra</p>
            </div>
            <p className="text-muted-foreground mb-6 text-center">
              Enter your API key to get started. Get one for free at{" "}
              <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
                openrouter.ai
              </a>
            </p>
            <input
              type="password"
              placeholder="sk-or-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-input bg-background rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Button
              onClick={() => handleSetApiKey(apiKey)}
              disabled={!apiKey.trim()}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              Connect
            </Button>
          </Card>
        </div>
      </ThemeProvider>
    )
  }

  const showModelPicker = !authEnabled && apiKeySet

  return (
    <ThemeProvider theme={theme}>
      {showModelSelector && (
        <ModelSelector
          categorizedModels={categorizedModels}
          selectedModel={selectedModel}
          onSelectModel={handleModelChange}
          onClose={() => setShowModelSelector(false)}
        />
      )}
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation
          theme={theme}
          onThemeToggle={handleThemeToggle}
          imageMode={imageMode}
          onImageModeToggle={setImageMode}
          hasImageModel={hasImageModel}
          user={user}
        />
        <div className="flex flex-1 min-h-0">
          {authEnabled && user && (
            <ConversationSidebar
              currentConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              refreshTrigger={sidebarRefresh}
            />
          )}
          <ChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={loading}
            imageMode={imageMode}
            selectedModelName={authEnabled && user ? (user.usage_limit === 100 ? "GPT-4 (Pro)" : user.usage_limit === 10 ? "GPT-3.5 (Free)" : "Model") : selectedModelName}
            onModelClick={showModelPicker ? () => setShowModelSelector(true) : undefined}
          />
        </div>
      </div>
    </ThemeProvider>
  )
}
