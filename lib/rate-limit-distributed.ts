import { getRedisClient } from "@/lib/redis-client"
import { rateLimit } from "@/lib/rate-limit"

const CHAT_BURST_WINDOW_MS = 60_000

function sanitizeKeyPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 180)
}

/**
 * Fixed-window counter in Redis (aligned to windowMs epochs).
 * Falls back to in-process {@link rateLimit} when REDIS_URL is unset or Redis errors.
 */
export async function rateLimitDistributed(
  logicalKey: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisClient()
  if (!redis) {
    const r = rateLimit(logicalKey, { windowMs, max })
    return { allowed: r.allowed, remaining: r.remaining }
  }

  const bucket = Math.floor(Date.now() / windowMs)
  const redisKey = `dailychatai:chatburst:${sanitizeKeyPart(logicalKey)}:${bucket}`

  try {
    const n = await redis.incr(redisKey)
    if (n === 1) {
      await redis.pexpire(redisKey, windowMs + 10_000)
    }
    const remaining = Math.max(0, max - n)
    return { allowed: n <= max, remaining }
  } catch (e) {
    console.error("[rateLimitDistributed] Redis failed, using memory fallback", e)
    const r = rateLimit(logicalKey, { windowMs, max })
    return { allowed: r.allowed, remaining: r.remaining }
  }
}

export { CHAT_BURST_WINDOW_MS }
