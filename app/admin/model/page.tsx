"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Sparkles, Eye, Code, MessageSquare, ExternalLink, Zap, Clock, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

interface Model {
  id: string
  name: string
  description: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  architecture?: {
    modality?: string
  }
  top_provider?: {
    is_moderated?: boolean
  }
  is_active: boolean
  is_free: boolean
  is_public: boolean
  provider: string
}

export default function AdminModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [filteredModels, setFilteredModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "context">("name")
  const { accessToken } = useAuth()

  useEffect(() => {
    if (accessToken) fetchModels()
  }, [accessToken])

  useEffect(() => {
    filterAndSortModels()
  }, [models, searchQuery, sortBy])

  const fetchModels = async () => {
    if (!accessToken) return
    try {
      const response = await fetch("/api/admin/models", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await response.json()
      setModels(data.models || [])
    } catch (error) {
      console.error("Failed to fetch models:", error)
      toast.error("Failed to fetch models")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!accessToken) return
    setSyncing(true)
    try {
      const response = await fetch("/api/admin/models/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        fetchModels()
      } else {
        toast.error(data.error || "Sync failed")
      }
    } catch (error) {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const handleUpdateModel = async (id: string, updates: Partial<Model>) => {
    if (!accessToken) return
    // Optimistic update
    setModels(models.map(m => m.id === id ? { ...m, ...updates } : m))
    
    try {
      const response = await fetch(`/api/admin/models/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error("Failed to update")
      }
    } catch (error) {
      toast.error("Failed to update status")
      // Revert
      fetchModels()
    }
  }

  const filterAndSortModels = () => {
    let filtered = models.filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      } else {
        return (b.context_length || 0) - (a.context_length || 0)
      }
    })

    setFilteredModels(filtered)
  }

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
    return length.toString()
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Manage Models</h1>
                <p className="text-muted-foreground mt-1">
                  Browse and review {models.length} available models
                </p>
              </div>
            </div>
            <Button onClick={handleSync} disabled={syncing} className="gap-2">
               <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
               {syncing ? "Syncing..." : "Sync Models"}
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models by name, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "name" ? "default" : "outline"}
                onClick={() => setSortBy("name")}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Name
              </Button>
              <Button
                variant={sortBy === "context" ? "default" : "outline"}
                onClick={() => setSortBy("context")}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Context
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading models...</p>
            </div>
          )}

          {/* Models Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((model) => (
                <Card key={model.id} className="p-6 hover:shadow-lg transition-shadow border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">{model.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
                    </div>
                    {model.architecture?.modality?.includes("image") && (
                      <div className="ml-2 p-2 rounded-lg bg-purple-500/10">
                        <Eye className="w-4 h-4 text-purple-500" />
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[60px]">
                    {model.description || "No description available"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{formatContextLength(model.context_length)} tokens</span>
                    </div>
                    {model.top_provider?.is_moderated && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Code className="w-3.5 h-3.5" />
                        <span>Moderated</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${model.is_free ? "text-green-500" : "text-muted-foreground"}`}>
                                {model.is_free ? "FREE" : "PAID"}
                            </span>
                            <Switch 
                                checked={model.is_free}
                                onCheckedChange={(checked) => handleUpdateModel(model.id, { is_free: checked })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${model.is_public ? "text-blue-500" : "text-muted-foreground"}`}>
                                {model.is_public ? "PUBLIC" : "PRIVATE"}
                            </span>
                            <Switch 
                                checked={model.is_public}
                                onCheckedChange={(checked) => handleUpdateModel(model.id, { is_public: checked })}
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${model.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                                {model.is_active ? "Active" : "Inactive"}
                            </span>
                            <Switch 
                                checked={model.is_active}
                                onCheckedChange={(checked) => handleUpdateModel(model.id, { is_active: checked })}
                            />
                        </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
