"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Search, Sparkles, Zap, Gauge, Star, Check } from "lucide-react"
import { getCategoryInfo, type ModelCategory, type CategorizedModel } from "@/lib/model-categories"

interface ModelSelectorProps {
  categorizedModels: Record<ModelCategory, CategorizedModel[]>
  selectedModel: string
  onSelectModel: (modelId: string) => void
  onClose: () => void
}

export default function ModelSelector({
  categorizedModels,
  selectedModel,
  onSelectModel,
  onClose,
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<ModelCategory | "all">("all")

  const categoryIcons: Record<ModelCategory, any> = {
    ultra: Sparkles,
    pro: Star,
    fast: Zap,
    normal: Gauge,
    slow: Gauge,
  }

  const categories: ModelCategory[] = ["ultra", "pro", "fast", "normal", "slow"]

  // Filter models based on search and category
  const filterModels = (models: CategorizedModel[]) => {
    if (!searchQuery) return models
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const getTotalCount = () => {
    return Object.values(categorizedModels).reduce((sum, models) => sum + models.length, 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold">Select Model</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{getTotalCount()} models</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-background"
            />
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeCategory === "all" ? (
            <div className="space-y-6">
              {categories.map((category) => {
                const models = filterModels(categorizedModels[category] || [])
                if (models.length === 0) return null

                const info = getCategoryInfo(category)
                const Icon = categoryIcons[category]

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" />
                      <h3 className="font-medium text-sm">{info.label}</h3>
                      <span className="text-xs text-muted-foreground">({models.length})</span>
                    </div>
                    <div className="space-y-1">
                      {models.map((model) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isSelected={selectedModel === model.id}
                          onSelect={() => {
                            onSelectModel(model.id)
                            onClose()
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filterModels(categorizedModels[activeCategory] || []).map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  onSelect={() => {
                    onSelectModel(model.id)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery &&
            Object.values(categorizedModels).every(
              (models) => filterModels(models || []).length === 0
            ) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No models found matching "{searchQuery}"</p>
              </div>
            )}
        </div>
      </Card>
    </div>
  )
}

function ModelCard({
  model,
  isSelected,
  onSelect,
}: {
  model: CategorizedModel
  isSelected: boolean
  onSelect: () => void
}) {
  const info = getCategoryInfo(model.category)

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? "border-primary bg-muted/30"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{model.name}</h4>
            {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{model.id}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded border ${info.badge}`}>{info.label}</span>
            <span className="text-xs text-muted-foreground">
              {model.provider === "vision" ? "Vision" : "Text"}
            </span>
            <span className="text-xs text-muted-foreground">
              {(model.context_length / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
