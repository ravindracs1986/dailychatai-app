import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG } from "@/lib/api-config"
import { CONFIG, isLocalLlmActive } from "@/config"
import { isActiveLocalModel, postLocalLlmChatCompletions } from "@/lib/local-llm"
import dns from "dns"
import { getCurrentUser } from "@/lib/get-current-user"
import { isDatabaseConfigured, queryOne } from "@/lib/db"
import { getRandomApiKey, getAllApiKeys } from "@/config"
import crypto from "crypto"
import {
  getUserUsage,
  getOrCreateDailyUsage,
  getChatBurstPerMinuteForUser,
  isLocalLlmEnabledForUser,
  getSubscriptionAccessForUser,
  getAnonymousUsage,
  incrementAnonymousUsage,
  type GeoInfo,
} from "@/lib/usage"
import {
  getConversation,
  listMessages,
  addMessage,
  createConversation,
} from "@/lib/conversation-repo"
import { getRateLimitKey } from "@/lib/rate-limit"
import { rateLimitDistributed, CHAT_BURST_WINDOW_MS } from "@/lib/rate-limit-distributed"

const UPSTREAM_TIMEOUT_MS = 90_000
let dnsOrderSet = false

function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function safeJsonStringify(v: unknown, maxChars = 4000): string {
  try {
    const s = JSON.stringify(v)
    return s.length > maxChars ? `${s.slice(0, maxChars)}…<truncated>` : s
  } catch {
    return "<unserializable>"
  }
}

function sanitizeMessagesForLog(
  messages: { role: string; content: string }[],
  maxMessages = 3,
  maxContentChars = 200
) {
  return messages.slice(-maxMessages).map((m) => ({
    role: m.role,
    content:
      (m.content || "").length > maxContentChars
        ? `${m.content.slice(0, maxContentChars)}…<truncated>`
        : m.content,
  }))
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

function getGeoInfo(req: NextRequest): GeoInfo {
  const headers = req.headers
  return {
    country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"),
    region: headers.get("x-vercel-ip-region"),
    city: headers.get("x-vercel-ip-city"),
    latitude: parseFloat(headers.get("x-vercel-ip-latitude") || "") || null,
    longitude: parseFloat(headers.get("x-vercel-ip-longitude") || "") || null,
    timezone: headers.get("x-vercel-ip-timezone"),
    isp: null, // Requires IP lookup service
    connection_type: null,
    zip_code: null
  }
}

async function getUserByApiKey(token: string) {
  if (!token.startsWith("sk-wing-")) return null
  const hash = crypto.createHash("sha256").update(token).digest("hex")
  const row = await queryOne<{ user_id: string }>(
    "SELECT user_id FROM api_keys WHERE key_hash = ?",
    [hash]
  )
  if (!row) return null
  
  // Update last used
  // We don't await this to avoid slowing down the response
  import("@/lib/db").then(({ execute }) => 
    execute("UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ?", [hash])
  )
  
  return { id: row.user_id }
}

/**
 * Chat API: supports three modes.
 * 1) Authenticated User (Session): Bearer <jwt> -> persist, usage limits, plan-based.
 * 2) Authenticated API Key: Bearer sk-wing-... -> usage limits, plan-based.
 * 3) Legacy/Anonymous: no auth -> OpenRouter direct (limited).
 */
export async function POST(request: NextRequest) {
  const reqId = shortId()
  const dbConfigured = await isDatabaseConfigured()
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  
  let user: { id: string } | null = null
  let isApiKeyAuth = false

  if (dbConfigured && token) {
      if (token.startsWith("sk-wing-")) {
          // API Key Auth
          user = await getUserByApiKey(token)
          isApiKeyAuth = true
      } else {
          // JWT Auth
          user = await getCurrentUser(request)
      }
  }

  const geoInfo = getGeoInfo(request)

  if (user) {
    // Shared logic for authenticated users (both Session and API Key)
    const burstMax = await getChatBurstPerMinuteForUser(user.id)
    const key = isApiKeyAuth ? `apikey:${user.id}` : getRateLimitKey(request.headers, "chat")
    const { allowed } = await rateLimitDistributed(key, CHAT_BURST_WINDOW_MS, burstMax)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const access = await getSubscriptionAccessForUser(user.id)
    if (access.restricted) {
      return NextResponse.json(
        { error: "Subscription expired. Please renew your subscription to continue." },
        { status: 403 }
      )
    }

    const usage = await getUserUsage(user.id)
    if (!usage.canSend) {
      return NextResponse.json(
        {
          error: "Daily message limit reached. Please try again after midnight UTC.",
          code: "USAGE_LIMIT_REACHED",
        },
        { status: 403 }
      )
    }

    try {
      const body = await request.json()
      // Support standard OpenAI format (messages array) or internal format (message string)
      let messages: { role: string; content: string }[] = []
      let conversationId = body.conversationId ?? null
      const projectId = body.projectId ?? null
      
      if (body.messages && Array.isArray(body.messages)) {
          // OpenAI compatible mode
          messages = body.messages
      } else if (typeof body.message === "string") {
          // Internal mode
          const userMessage = body.message.trim()
          if (!userMessage) return NextResponse.json({ error: "Missing message" }, { status: 400 })
          
          if (conversationId) {
            const conv = await getConversation(conversationId, user.id)
            if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
            const rows = await listMessages(conversationId)
            messages = rows.map((m) => ({ role: m.role, content: m.content }))
          } else {
            conversationId = await createConversation(
              user.id,
              userMessage.slice(0, 100) || "New Chat",
              projectId
            )
          }
          messages.push({ role: "user", content: userMessage })
      } else {
          return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
      }

      const localAllowed = isLocalLlmActive() && (await isLocalLlmEnabledForUser(user.id))
      const requestedModel = typeof body.model === "string" ? body.model.trim() : ""
      // Local LLM only for a model that exists in local_models. OpenRouter ids stay on OpenRouter.
      const useLocal =
        localAllowed && (requestedModel ? await isActiveLocalModel(requestedModel) : true)
      const upstreamBase = useLocal ? CONFIG.localLlm.baseUrl : API_CONFIG.OPENROUTER_BASE_URL
      if (CONFIG.generation.chatDebug) {
        console.log(
          `[chat:${reqId}] start auth=${isApiKeyAuth ? "apikey" : "jwt"} useLocal=${useLocal} base=${upstreamBase} model=${body.model ?? "(auto)"} maxTokensCap=${CONFIG.generation.chatMaxTokens}`
        )
      }

      // Windows/Node can prefer IPv6; if your VPS hostname has AAAA, that can hang while curl uses IPv4.
      // Prefer IPv4 for upstream calls (safe for OpenRouter too).
      if (!dnsOrderSet) {
        try {
          dns.setDefaultResultOrder("ipv4first")
        } catch {
          // ignore if not supported
        }
        dnsOrderSet = true
      }

      // Keep self-hosted CPU models responsive by limiting forwarded context.
      const originalMessagesCount = messages.length
      if (useLocal && CONFIG.generation.chatMaxHistoryMessages > 0) {
        messages = messages.slice(-CONFIG.generation.chatMaxHistoryMessages)
      }

      if (CONFIG.generation.chatDebug) {
        const chars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)
        console.log(
          `[chat:${reqId}] messages original=${originalMessagesCount} forwarded=${messages.length} chars=${chars} conversationId=${body.conversationId ?? "none"}`
        )
        if (useLocal && CONFIG.localLlm.baseUrl) {
          try {
            const host = new URL(CONFIG.localLlm.baseUrl).hostname
            dns.lookup(host, { all: true }, (err, addrs) => {
              if (!err && addrs?.length) {
                console.log(`[chat:${reqId}] dns ${host} -> ${addrs.map((a) => `${a.address}/${a.family}`).join(", ")}`)
              }
            })
          } catch {}
        }
      }

      let apiKey: string | null = null
      if (!useLocal) {
        apiKey = getRandomApiKey()
        if (!apiKey) {
          return NextResponse.json({ error: "API keys not configured" }, { status: 503 })
        }
      }

      let model: string
      if (useLocal) {
        const resolved =
          (typeof body.model === "string" && body.model.trim()) || CONFIG.localLlm.defaultModel || ""
        if (!resolved) {
          return NextResponse.json(
            { error: "Missing model: set LLM_DEFAULT_MODEL or pass model in the request body" },
            { status: 400 }
          )
        }
        model = resolved
      } else {
        const requested = typeof body.model === "string" ? body.model.trim() : ""
        if (!requested) {
          return NextResponse.json({ error: "Missing model" }, { status: 400 })
        }
        if (!(await isAllowedOpenRouterModel(requested))) {
          return NextResponse.json({ error: "This model is not available" }, { status: 403 })
        }
        model = requested
      }

      const maxTokens =
        typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens) && body.max_tokens > 0
          ? Math.min(body.max_tokens, CONFIG.generation.chatMaxTokens)
          : CONFIG.generation.chatMaxTokens

      if (CONFIG.generation.chatDebug) {
        console.log(
          `[chat:${reqId}] upstreamRequest ${useLocal ? "local" : "openrouter"}=` +
            safeJsonStringify({
              model,
              stream: !!body.stream,
              max_tokens: maxTokens,
              // Only log a small tail of messages to avoid leaking data
              messages: sanitizeMessagesForLog(messages),
            })
        )
      }

      const upstreamStartedAt = Date.now()
      const response = useLocal
        ? await postLocalLlmChatCompletions({
            model,
            messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
            stream: body.stream || false,
            max_tokens: maxTokens,
          })
        : await fetchWithTimeout(
            `${API_CONFIG.OPENROUTER_BASE_URL}/chat/completions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey!}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: model || "openai/gpt-3.5-turbo",
                messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
                stream: body.stream || false,
                max_tokens: maxTokens,
              }),
            },
            UPSTREAM_TIMEOUT_MS
          )

      if (CONFIG.generation.chatDebug) {
        console.log(
          `[chat:${reqId}] upstreamStatus=${response.status} ok=${response.ok} ms=${Date.now() - upstreamStartedAt} useLocal=${useLocal}`
        )
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (CONFIG.generation.chatDebug) {
          console.log(`[chat:${reqId}] upstreamErrorJson=${safeJsonStringify(err)}`)
        }
        return NextResponse.json(
          { error: (err as { error?: { message?: string } })?.error?.message || "API request failed" },
          { status: response.status }
        )
      }

      const data = await response.json()
      if (CONFIG.generation.chatDebug) {
        console.log(`[chat:${reqId}] upstreamResponseJson=${safeJsonStringify(data)}`)
      }
      const upstreamMs = Date.now() - upstreamStartedAt
      if (upstreamMs > 5_000) {
        console.log(`[chat] upstream=${useLocal ? "local" : "openrouter"} ms=${upstreamMs} model=${model}`)
      }
      const content = data.choices?.[0]?.message?.content ?? "No response"
      const tokens = data.usage?.total_tokens ?? 0

      // Only persist if using internal format (conversationId present)
      // For API usage (IDE), we might not want to clutter DB with every completion unless requested
      // But to track usage accurately, we do need to track tokens.
      
      if (conversationId) {
          // Persist whenever a conversation exists so token accounting is not lost.
          const lastUserMsg = messages[messages.length - 1]
           await addMessage({
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            content: lastUserMsg.content,
          })
          await addMessage({
            conversation_id: conversationId,
            user_id: null,
            role: "assistant",
            content,
            tokens,
          })
      }

      await getOrCreateDailyUsage(user.id, tokens)
      
      // Also track in anonymous_usage (global audit log)
      const ip = getRateLimitKey(request.headers, "chat")
      await incrementAnonymousUsage(ip, tokens, user.id, geoInfo)

      return NextResponse.json({
        choices: [{ message: { role: "assistant", content } }], // OpenAI format
        content, // Internal format
        model: data.model,
        usage: data.usage,
        conversationId,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (CONFIG.generation.chatDebug) {
          console.log(`[chat:${reqId}] timeout after ${UPSTREAM_TIMEOUT_MS}ms`)
        }
        return NextResponse.json(
          {
            error:
              "Upstream model timed out. Try a smaller prompt, a faster model, or enable streaming.",
          },
          { status: 504 }
        )
      }
      console.error("[chat]", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      )
    }
  }

  // Legacy: no auth, client sends apiKey, model, messages
  try {
    const parsed = await request.json() as {
      apiKey?: string
      model?: string
      messages?: { role: string; content: string }[]
      stream?: boolean
    }
    let apiKey: string | null | undefined = parsed.apiKey
    let model = parsed.model
    const messages = parsed.messages
    let isAnonymous = false
    let ip = ""

    if (!messages) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    // Per-user hybrid: anonymous traffic always uses OpenRouter.

    // If no API key provided or if it matches a system key, check for anonymous usage
    const systemKeys = getAllApiKeys()
    const isSystemKey = apiKey && systemKeys.includes(apiKey)

    if (!apiKey || isSystemKey) {
      if (!dbConfigured) {
        return NextResponse.json({ error: "API Key required" }, { status: 400 })
      }

      ip = getRateLimitKey(request.headers)
      const anonBurst = CONFIG.rateLimits.anonymousChatBurstPerMinute
      const burst = await rateLimitDistributed(`anonchat:${ip}`, CHAT_BURST_WINDOW_MS, anonBurst)
      if (!burst.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
      const usage = await getAnonymousUsage(ip)
      
      // Limit anonymous users to 5 messages per day (as requested)
      if (usage.message_count >= 5) {
        return NextResponse.json(
          { error: "Daily limit reached. Please sign up for more." }, 
          { status: 403 }
        )
      }

      // Always use a fresh random key from config to ensure load balancing/rotation
      apiKey = getRandomApiKey()
      if (!apiKey) {
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
      }
      isAnonymous = true
    }

    if (!model) {
      return NextResponse.json({ error: "Missing model" }, { status: 400 })
    }

    if (!(await isAllowedOpenRouterModel(model))) {
      return NextResponse.json({ error: "This model is not available" }, { status: 403 })
    }

    const response = await fetch(`${API_CONFIG.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: (error as { error?: { message?: string } })?.error?.message || "API request failed" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "No response"

    if (isAnonymous) {
      await incrementAnonymousUsage(ip, data.usage?.total_tokens ?? 0, null, geoInfo)
    }

    return NextResponse.json({
      content,
      model: data.model,
      usage: data.usage,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

async function isAllowedOpenRouterModel(modelId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM models WHERE id = ? AND is_active = 1",
    [modelId]
  )
  return !!row
}
