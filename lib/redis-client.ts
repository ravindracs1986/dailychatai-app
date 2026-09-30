import Redis from "ioredis"

let client: Redis | null | undefined

/**
 * Singleton Redis client for rate limiting and future shared state.
 * Returns null when REDIS_URL is unset — callers should fall back (see lib/rate-limit-distributed.ts).
 */
export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return null
  if (client === undefined) {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
    client.on("error", (err) => {
      console.error("[redis]", err.message)
    })
  }
  return client
}
