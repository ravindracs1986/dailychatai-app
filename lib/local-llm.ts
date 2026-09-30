import { CONFIG } from "@/config"
import http from "http"
import https from "https"
import dns from "dns"

/** OpenAI-compatible `GET /v1/models` row mapped for this app's model list UI. */
export type LocalLlmModelRow = {
  id: string
  name: string
  provider: string
  context_length: number
  pricing: { prompt: string; completion: string }
  architecture_modality: string
}

export async function fetchLocalLlmModelRows(): Promise<LocalLlmModelRow[]> {
  const base = CONFIG.localLlm.baseUrl
  if (!base) return []

  const headers: Record<string, string> = {}
  if (CONFIG.localLlm.apiKey) {
    headers.Authorization = `Bearer ${CONFIG.localLlm.apiKey}`
  }

  const res = await fetch(`${base}/models`, { headers, cache: "no-store" })
  if (!res.ok) return []

  const data = (await res.json()) as {
    data?: Array<{ id: string; owned_by?: string; context_length?: number }>
  }
  const rows = data.data ?? []

  return rows.map((m) => ({
    id: m.id,
    name: m.id,
    provider: "local",
    context_length: typeof m.context_length === "number" ? m.context_length : 8192,
    pricing: { prompt: "0", completion: "0" },
    architecture_modality: "text",
  }))
}

export async function postLocalLlmChatCompletions(body: {
  model: string
  messages: { role: string; content: string }[]
  stream?: boolean
  max_tokens?: number
}): Promise<Response> {
  const base = CONFIG.localLlm.baseUrl
  if (!base) {
    return new Response(JSON.stringify({ error: { message: "LLM_BASE_URL not set" } }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (CONFIG.localLlm.apiKey) {
    headers.Authorization = `Bearer ${CONFIG.localLlm.apiKey}`
  }

  // Some Windows/Node setups can hang on fetch() to certain HTTPS reverse proxies.
  // Use http(s).request forced to HTTP/1.1 for reliability (curl-equivalent behavior).
  return postJsonHttp11(`${base}/chat/completions`, headers, {
    model: body.model,
    messages: body.messages,
    stream: body.stream ?? false,
    // OpenAI-style cap (some servers honor this)
    ...(typeof body.max_tokens === "number" ? { max_tokens: body.max_tokens } : {}),
    // Ollama-style cap (commonly honored)
    ...(typeof body.max_tokens === "number" ? { options: { num_predict: body.max_tokens } } : {}),
  })
}

function postJsonHttp11(
  urlString: string,
  headers: Record<string, string>,
  jsonBody: unknown
): Promise<Response> {
  const url = new URL(urlString)
  const isHttps = url.protocol === "https:"
  const mod = isHttps ? https : http

  const body = JSON.stringify(jsonBody)
  const reqHeaders: Record<string, string> = {
    ...headers,
    "Content-Length": Buffer.byteLength(body).toString(),
  }

  return new Promise((resolve) => {
    const req = mod.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: reqHeaders,
        // Force IPv4 so we don't hang on AAAA/IPv6 routes.
        family: 4,
        lookup: (hostname, options, cb) => {
          dns.lookup(hostname, { ...options, family: 4 }, cb)
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          resolve(
            new Response(text, {
              status: res.statusCode || 500,
              headers: { "Content-Type": res.headers["content-type"] || "application/json" },
            })
          )
        })
      }
    )
    // Avoid hanging until upstream/proxy times out (Cloudflare 524).
    req.setTimeout(90_000, () => {
      req.destroy(new Error("Upstream request timed out"))
    })
    req.on("error", (err) => {
      resolve(
        new Response(JSON.stringify({ error: { message: err.message } }), {
          status: err.message.includes("timed out") ? 504 : 502,
          headers: { "Content-Type": "application/json" },
        })
      )
    })
    req.write(body)
    req.end()
  })
}
