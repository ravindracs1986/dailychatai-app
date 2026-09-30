// API Configuration for OpenRouter
export const API_CONFIG = {
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  OPENROUTER_MODELS_ENDPOINT: "https://openrouter.ai/api/v1/models",
  STORAGE_KEYS: {
    API_KEY: "openrouter_api_key",
    THEME: "theme",
    SELECTED_MODEL: "selected_model",
  },
  ENDPOINTS: {
    CHAT: "/api/chat",
    MODELS: "/api/models",
    IMAGE: "/api/generate-image",
  },
} as const

// Validation helper
export function validateApiKey(key: string): boolean {
  return key.startsWith("sk-or-") && key.length > 10
}
