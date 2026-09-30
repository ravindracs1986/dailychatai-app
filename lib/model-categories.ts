/**
 * Model categorization based on performance and capabilities
 */

export type ModelCategory = "ultra" | "pro" | "fast" | "normal" | "slow"

export interface CategorizedModel {
  id: string
  name: string
  provider: string
  context_length: number
  category: ModelCategory
}

const ULTRA_KEYWORDS = [
  "gpt-5",
  "gpt-4.1",
  "o3",
  "o4",
  "claude-opus-4",
  "claude-sonnet-4",
  "gemini-3",
  "gemini-2.5-pro",
  "deepseek-v3.2",
  "grok-4",
]

const PRO_KEYWORDS = [
  "gpt-4o",
  "o1",
  "claude-3.7",
  "claude-opus",
  "claude-sonnet-3.5",
  "gemini-2.5-flash",
  "gemini-2.0",
  "deepseek-r1",
  "deepseek-v3",
  "qwen3",
  "grok-3",
  "mistral-large",
  "nova-premier",
  "llama-4",
]

const FAST_KEYWORDS = [
  "flash",
  "mini",
  "nano",
  "lite",
  "small",
  "turbo",
  "fast",
  "8b",
  "7b",
  "3b",
  "haiku",
]

/**
 * Categorize a model based on its name, provider, and context length
 */
export function categorizeModel(model: {
  id: string
  name: string
  provider: string
  context_length: number
}): ModelCategory {
  const modelStr = `${model.id} ${model.name}`.toLowerCase()

  // Ultra tier - Latest and most powerful models
  if (ULTRA_KEYWORDS.some((kw) => modelStr.includes(kw.toLowerCase()))) {
    return "ultra"
  }

  // Pro tier - High performance models
  if (PRO_KEYWORDS.some((kw) => modelStr.includes(kw.toLowerCase()))) {
    return "pro"
  }

  // Fast tier - Optimized for speed
  if (FAST_KEYWORDS.some((kw) => modelStr.includes(kw.toLowerCase()))) {
    return "fast"
  }

  // Normal tier - Balanced models (context > 32k)
  if (model.context_length > 32000) {
    return "normal"
  }

  // Slow tier - Older or smaller context models
  return "slow"
}

/**
 * Categorize an array of models
 */
export function categorizeModels(
  models: Array<{ id: string; name: string; provider: string; context_length: number }>
): Record<ModelCategory, CategorizedModel[]> {
  const categorized: Record<ModelCategory, CategorizedModel[]> = {
    ultra: [],
    pro: [],
    fast: [],
    normal: [],
    slow: [],
  }

  models.forEach((model) => {
    const category = categorizeModel(model)
    categorized[category].push({
      ...model,
      category,
    })
  })

  return categorized
}

/**
 * Get category display information
 */
export function getCategoryInfo(category: ModelCategory) {
  const info = {
    ultra: {
      label: "Ultra",
      description: "Latest flagship models with cutting-edge capabilities",
      color: "from-purple-500 to-pink-600",
      badge: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    },
    pro: {
      label: "Pro",
      description: "High-performance models for complex tasks",
      color: "from-blue-500 to-cyan-600",
      badge: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    },
    fast: {
      label: "Fast",
      description: "Optimized for speed and efficiency",
      color: "from-green-500 to-emerald-600",
      badge: "bg-green-500/10 text-green-600 border-green-500/30",
    },
    normal: {
      label: "Normal",
      description: "Balanced performance and capabilities",
      color: "from-orange-500 to-amber-600",
      badge: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    },
    slow: {
      label: "Standard",
      description: "Reliable models for general use",
      color: "from-gray-500 to-slate-600",
      badge: "bg-gray-500/10 text-gray-600 border-gray-500/30",
    },
  }

  return info[category]
}
