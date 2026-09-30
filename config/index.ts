/**
 * Unified Configuration for AI Chat Application
 * Reads values from environment variables (.env) and exposes helpers
 */

export interface SiteConfig {
  name: string
  title: string
  description: string
  author: string
  version: string
  url: string
  logo?: string
  favicon?: string
  ogImage?: string
}

export interface ConfiguredModel {
  id: string
  name: string
  provider: string
  enabled: boolean
}

export interface LocalLlmConfig {
  /** OpenAI-compatible API root including `/v1`, e.g. `https://ai.example.com/v1` */
  baseUrl: string | null
  apiKey: string | null
  defaultModel: string | null
}

export interface AppConfig {
  site: SiteConfig
  apiKeys: string[]
  customModels: ConfiguredModel[]
  localLlm: LocalLlmConfig
  generation: {
    /** Max tokens to generate per response for non-streaming chat. */
    chatMaxTokens: number
    /** When true, logs upstream routing + timings for /api/chat. */
    chatDebug: boolean
    /** Max messages forwarded upstream (keeps CPU models responsive). */
    chatMaxHistoryMessages: number
  }
  /** Chat burst limits: plan column `chat_burst_per_minute` for auth users; env for anonymous. */
  rateLimits: {
    anonymousChatBurstPerMinute: number
  },
  features: {
    allowUserApiKeys: boolean
    allowCustomModels: boolean
    imageGenerationEnabled: boolean
    /** When true and `LLM_BASE_URL` is set, chat and model listing use the self-hosted OpenAI-compatible API. */
    localLlmEnabled: boolean
  }
}

import { getEnv } from "@/lib/crypto"

// Helpers to parse environment values
function parseBoolean(v: string | undefined, def = false): boolean {
  if (v === undefined) return def
  return ["1", "true", "yes", "on"].includes(v.toLowerCase())
}

function parseStringArray(v: string | undefined): string[] {
  if (!v) return []
  return v.split(",").map((s) => s.trim()).filter(Boolean)
}

function parseJson<T>(v: string | undefined, def: T): T {
  if (!v) return def
  try {
    return JSON.parse(v) as T
  } catch (e) {
    return def
  }
}

function parsePositiveInt(v: string | undefined, def: number): number {
  const n = parseInt(v || "", 10)
  return Number.isFinite(n) && n > 0 ? n : def
}

// Read values from environment. For Next.js, .env* files are loaded automatically.
export const CONFIG: AppConfig = {
  site: {
    name: process.env.SITE_NAME || "AI Chat",
    title: process.env.SITE_TITLE || "AI Chat - Powered by dailychatai",
    description:
      process.env.SITE_DESCRIPTION ||
      "A simple and powerful AI chat application with support for multiple models and providers",
    author: process.env.SITE_AUTHOR || "dailychatai",
    version: process.env.SITE_VERSION || "1.0.0",
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:5005",
    logo: process.env.SITE_LOGO || "/logo.png",
    favicon: process.env.SITE_FAVICON || "/favicon.ico",
    ogImage: process.env.SITE_OG_IMAGE || "/og-image.png",
  },

  // API Keys: provide a comma-separated list in `API_KEYS` (server-only)
  apiKeys: parseStringArray(getEnv("API_KEYS") || getEnv("OPENROUTER_API_KEYS")),

  // Custom models: optional JSON array in CUSTOM_MODELS env var
  customModels: parseJson<ConfiguredModel[]>(process.env.CUSTOM_MODELS, []),

  localLlm: {
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL),
    apiKey: (process.env.LLM_API_KEY || "").trim() || null,
    defaultModel: (process.env.LLM_DEFAULT_MODEL || "").trim() || null,
  },

  generation: {
    chatMaxTokens: parsePositiveInt(process.env.CHAT_MAX_TOKENS, 512),
    chatDebug: parseBoolean(process.env.CHAT_DEBUG, false),
    chatMaxHistoryMessages: parsePositiveInt(process.env.CHAT_MAX_HISTORY_MESSAGES, 12),
  },

  rateLimits: {
    anonymousChatBurstPerMinute: parsePositiveInt(process.env.CHAT_BURST_ANONYMOUS_PER_MINUTE, 30),
  },

  features: {
    allowUserApiKeys: parseBoolean(process.env.ALLOW_USER_API_KEYS, false),
    allowCustomModels: parseBoolean(process.env.ALLOW_CUSTOM_MODELS, true),
    imageGenerationEnabled: parseBoolean(process.env.IMAGE_GENERATION_ENABLED, true),
    localLlmEnabled: parseBoolean(process.env.LOCAL_LLM_ENABLED, false),
  },
}

function normalizeBaseUrl(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim().replace(/\/+$/, "")
  return t.length > 0 ? t : null
}

/** Self-hosted LLM mode: `LOCAL_LLM_ENABLED` and a non-empty `LLM_BASE_URL`. */
export function isLocalLlmActive(): boolean {
  return CONFIG.features.localLlmEnabled && !!CONFIG.localLlm.baseUrl
}

// Utility Functions

export function getEnabledApiKeys(): string[] {
  return CONFIG.apiKeys.filter((k) => k && k.length > 0)
}

export function getAllApiKeys(): string[] {
  return CONFIG.apiKeys
}

export function getEnabledCustomModels(): ConfiguredModel[] {
  return CONFIG.customModels.filter((m) => m.enabled)
}

export function hasConfiguredApiKeys(): boolean {
  return getEnabledApiKeys().length > 0
}

export function getDefaultApiKey(): string | null {
  const enabled = getEnabledApiKeys()
  return enabled.length > 0 ? enabled[0] : null
}

export function getRandomApiKey(): string | null {
  const enabled = getEnabledApiKeys()
  if (enabled.length === 0) return null
  return enabled[Math.floor(Math.random() * enabled.length)]
}
