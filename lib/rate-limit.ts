/**
 * In-memory rate limiter for API routes (auth endpoints, etc.).
 * Chat burst limits use Redis when `REDIS_URL` is set — see `lib/rate-limit-distributed.ts`.
 */

const store = new Map<string, { count: number; resetAt: number }>()
const CLEAN_INTERVAL = 60_000 // 1 min

function cleanup() {
  const now = Date.now()
  for (const [key, v] of store.entries()) {
    if (v.resetAt < now) store.delete(key)
  }
}
setInterval(cleanup, CLEAN_INTERVAL)

export interface RateLimitOptions {
  windowMs: number
  max: number
}

/**
 * Check rate limit by key (e.g. IP or userId). Returns { allowed: boolean, remaining: number }.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 60_000, max: 100 }
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = store.get(key)
  if (!record) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.max - 1 }
  }
  if (now >= record.resetAt) {
    record.count = 1
    record.resetAt = now + options.windowMs
    return { allowed: true, remaining: options.max - 1 }
  }
  record.count += 1
  const remaining = Math.max(0, options.max - record.count)
  return {
    allowed: record.count <= options.max,
    remaining,
  }
}

/**
 * Get client identifier from request (NextRequest has headers).
 */
export function getRateLimitKey(headers: Headers, prefix = ""): string {
  const forwarded = headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  return prefix ? `${prefix}:${ip}` : ip
}
