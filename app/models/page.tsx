"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Sparkles, Zap, Clock, Eye, Code, MessageSquare, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import ThemeProvider from "@/components/theme-provider"

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
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [filteredModels, setFilteredModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "context">("name")
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    
    fetchModels()
  }, [])

  useEffect(() => {
    filterAndSortModels()
  }, [models, searchQuery, sortBy])

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models/all")
      const data = await response.json()
      setModels(data.models || [])
    } catch (error) {
      console.error("Failed to fetch models:", error)
    } finally {
      setLoading(false)
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

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
    return length.toString()
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Navigation
          theme={theme}
          onThemeToggle={handleThemeToggle}
          imageMode={false}
          onImageModeToggle={() => {}}
          hasImageModel={false}
          hideControls={true}
        />

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Free AI Models</h1>
                <p className="text-muted-foreground mt-1">
                  Browse {models.length} free models available on OpenRouter
                </p>
              </div>
            </div>
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
                    {model.architecture?.modality === "text+image->text" && (
                      <div className="ml-2 p-2 rounded-lg bg-purple-500/10">
                        <Eye className="w-4 h-4 text-purple-500" />
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
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
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-green-500">FREE</span>
                    </div>
                    <a
                      href={`https://openrouter.ai/${model.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-500 hover:text-cyan-400 flex items-center gap-1 text-sm"
                    >
                      Details
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredModels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No models found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}
