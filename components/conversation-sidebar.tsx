"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react"
import { getStoredAccessToken } from "@/contexts/auth-context"

export interface ConversationItem {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface ConversationSidebarProps {
  currentConversationId: string | null
  onSelectConversation: (id: string | null) => void
  onNewChat: () => void
  refreshTrigger?: number
  projectId?: string | null
}

export default function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger = 0,
  projectId = null,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredAccessToken()
    if (!token) {
      setLoading(false)
      return
    }
    
    const url = projectId 
      ? `/api/projects/${projectId}/conversations` 
      : "/api/conversations"

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => {
        setConversations((data.conversations || []).slice(0, 50))
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [refreshTrigger, projectId])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const token = getStoredAccessToken()
    if (!token) return
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (currentConversationId === id) {
        onNewChat()
      }
    }
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
      <div className="p-2 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="w-4 h-4" />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectConversation(c.id)
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 group hover:bg-muted/50 cursor-pointer ${
                    currentConversationId === c.id ? "bg-muted" : ""
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{c.title || "New Chat"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => handleDelete(e, c.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
