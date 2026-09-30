/**
 * Usage tracking and plan limits enforcement.
 * Resets usage_today at midnight (or on first check of the day).
 */

import { query, queryOne, execute } from "@/lib/db"
import { generateUUID } from "@/lib/db"
import { PLAN_IDS } from "@/lib/plans"

export interface UserUsage {
  usage_today: number
  usage_limit: number | null
  canSend: boolean
}

export interface PlanQuotas {
  /** NULL means unlimited */
  messages_per_day: number | null
  /** NULL means unlimited (fallback applied when missing) */
  chat_burst_per_minute: number | null
}

/**
 * Get or create daily_usage row and increment message_count. Returns current usage for user today.
 */
export async function getOrCreateDailyUsage(
  userId: string,
  tokensUsed: number = 0
): Promise<{ message_count: number; tokens_used: number }> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const id = generateUUID()
  await execute(
    `INSERT INTO daily_usage (id, user_id, date, message_count, tokens_used)
     VALUES (?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       message_count = message_count + 1,
       tokens_used = tokens_used + ?`,
    [id, userId, today, tokensUsed, tokensUsed]
  )
  const row = await queryOne<{ message_count: number; tokens_used: number }>(
    "SELECT message_count, tokens_used FROM daily_usage WHERE user_id = ? AND date = ?",
    [userId, today]
  )
  return row ?? { message_count: 0, tokens_used: 0 }
}

export interface GeoInfo {
  isp?: string | null
  connection_type?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  zip_code?: string | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
}

/**
 * Get or create anonymous_usage row and increment message_count.
 */
export async function incrementAnonymousUsage(
  ipAddress: string,
  tokensUsed: number = 0,
  userId: string | null = null,
  geoInfo: GeoInfo = {}
): Promise<{ message_count: number; tokens_used: number }> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  
  const {
    isp = null,
    connection_type = null,
    country = null,
    region = null,
    city = null,
    zip_code = null,
    timezone = null,
    latitude = null,
    longitude = null
  } = geoInfo

  await execute(
    `INSERT INTO anonymous_usage (
       ip_address, date, message_count, tokens_used, 
       user_id, isp, connection_type, country, region, city, zip_code, timezone, latitude, longitude
     )
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       message_count = message_count + 1,
       tokens_used = tokens_used + ?,
       user_id = COALESCE(VALUES(user_id), user_id),
       isp = COALESCE(VALUES(isp), isp),
       connection_type = COALESCE(VALUES(connection_type), connection_type),
       country = COALESCE(VALUES(country), country),
       region = COALESCE(VALUES(region), region),
       city = COALESCE(VALUES(city), city),
       zip_code = COALESCE(VALUES(zip_code), zip_code),
       timezone = COALESCE(VALUES(timezone), timezone),
       latitude = COALESCE(VALUES(latitude), latitude),
       longitude = COALESCE(VALUES(longitude), longitude)`,
    [
      ipAddress, today, tokensUsed, 
      userId, isp, connection_type, country, region, city, zip_code, timezone, latitude, longitude,
      tokensUsed
    ]
  )
  const row = await queryOne<{ message_count: number; tokens_used: number }>(
    "SELECT message_count, tokens_used FROM anonymous_usage WHERE ip_address = ? AND date = ?",
    [ipAddress, today]
  )
  return row ?? { message_count: 0, tokens_used: 0 }
}

/**
 * Get anonymous usage for today.
 */
export async function getAnonymousUsage(ipAddress: string): Promise<{ message_count: number; tokens_used: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const row = await queryOne<{ message_count: number; tokens_used: number }>(
    "SELECT message_count, tokens_used FROM anonymous_usage WHERE ip_address = ? AND date = ?",
    [ipAddress, today]
  )
  return row ?? { message_count: 0, tokens_used: 0 }
}

/**
 * Get user's usage limit from plan and current usage for today.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const user = await queryOne<{ user_usage_limit: number | null; plan_usage_limit: number | null }>(
    `SELECT u.usage_limit AS user_usage_limit, p.messages_per_day AS plan_usage_limit
     FROM users u
     LEFT JOIN plans p ON u.plan_id = p.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  )
  if (!user) return { usage_today: 0, usage_limit: 10, canSend: false }
  const today = new Date().toISOString().slice(0, 10)
  const daily = await queryOne<{ message_count: number }>(
    "SELECT message_count FROM daily_usage WHERE user_id = ? AND date = ?",
    [userId, today]
  )
  const usage_today = daily?.message_count ?? 0
  const usage_limit = user.plan_usage_limit ?? user.user_usage_limit ?? 10
  return {
    usage_today,
    usage_limit,
    canSend: usage_limit === null ? true : usage_today < usage_limit,
  }
}

/**
 * Read plan quotas (messages/day + burst/min) for UI display.
 * Note: messages/day can be NULL for "Unlimited".
 */
export async function getPlanQuotasForUser(userId: string): Promise<PlanQuotas> {
  const row = await queryOne<{ messages_per_day: number | null; chat_burst_per_minute: number | null }>(
    `SELECT p.messages_per_day, p.chat_burst_per_minute
     FROM users u
     LEFT JOIN plans p ON u.plan_id = p.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  )
  return {
    messages_per_day: row?.messages_per_day ?? null,
    chat_burst_per_minute: row?.chat_burst_per_minute ?? null,
  }
}

/**
 * Reset usage_today on users table when date changes (call at start of day check or cron).
 * Here we derive "today" usage from daily_usage and sync to users.usage_today for quick reads.
 */
export async function syncUserUsageToday(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const row = await queryOne<{ message_count: number }>(
    "SELECT message_count FROM daily_usage WHERE user_id = ? AND date = ?",
    [userId, today]
  )
  await execute("UPDATE users SET usage_today = ? WHERE id = ?", [
    row?.message_count ?? 0,
    userId,
  ])
}

/**
 * Get allowed model for user's plan (Free: gpt-3.5-turbo, Pro/Enterprise: gpt-4 or plan.model).
 */
export async function getAllowedModelForUser(userId: string): Promise<string | null> {
  const plan = await queryOne<{ model: string | null; messages_per_day: number | null }>(
    `SELECT p.model, p.messages_per_day FROM users u
     LEFT JOIN plans p ON u.plan_id = p.id
     WHERE u.id = ?`,
    [userId]
  )
  return plan?.model ?? "gpt-3.5-turbo"
}

const DEFAULT_CHAT_BURST_PER_MINUTE = 60

/**
 * Per-user hybrid switch for self-hosted LLM.
 * When `LOCAL_LLM_ENABLED` is on globally, only users with `users.local_llm_enabled = 1`
 * should use the VPS model; others stay on OpenRouter.
 */
export async function isLocalLlmEnabledForUser(userId: string): Promise<boolean> {
  try {
    const row = await queryOne<{ local: number }>(
      "SELECT COALESCE(local_llm_enabled, 0) AS local FROM users WHERE id = ?",
      [userId]
    )
    return !!row && Number(row.local) === 1
  } catch (e) {
    console.error("[usage] isLocalLlmEnabledForUser", e)
    return false
  }
}

/**
 * Max chat requests per rolling minute window for this user, from {@link plans.chat_burst_per_minute}.
 * When plan is missing, returns default. On DB error (e.g. column not migrated), returns default.
 */
export async function getChatBurstPerMinuteForUser(userId: string): Promise<number> {
  try {
    const row = await queryOne<{ burst: number }>(
      `SELECT COALESCE(p.chat_burst_per_minute, ?) AS burst
       FROM users u
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [DEFAULT_CHAT_BURST_PER_MINUTE, userId]
    )
    if (!row) return DEFAULT_CHAT_BURST_PER_MINUTE
    const v = Number(row.burst)
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_CHAT_BURST_PER_MINUTE
  } catch (e) {
    console.error("[usage] getChatBurstPerMinuteForUser", e)
    return DEFAULT_CHAT_BURST_PER_MINUTE
  }
}

/**
 * Default usage limit for plan (used when creating/updating user).
 */
export async function getDefaultLimitForPlanId(planId: string | null): Promise<number | null> {
  if (!planId) return 10
  
  // Try to fetch from database first
  try {
    const plan = await queryOne<{ messages_per_day: number | null }>(
      "SELECT messages_per_day FROM plans WHERE id = ?",
      [planId]
    )
    if (plan) return plan.messages_per_day
  } catch (error) {
    console.error("Failed to fetch plan limit from DB, falling back to default", error)
  }

  // Fallback to safe default if DB fetch fails or plan not found
  return 10
}

export interface SubscriptionAccess {
  user_plan_id: string | null
  subscription: {
    id: string
    plan_id: string
    status: string
    current_period_start: string | null
    current_period_end: string | null
    is_expired: boolean
    derived_period_end: boolean
  } | null
  restricted: boolean
  reason: "expired" | "missing" | null
}

function parseDbTimestampToDate(v: Date | string | null): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v !== "string") return null
  const s = v.trim()
  if (!s) return null
  const tryDirect = new Date(s)
  if (Number.isFinite(tryDirect.getTime())) return tryDirect
  if (s.includes(" ") && !s.includes("T")) {
    const withZ = new Date(s.replace(" ", "T") + "Z")
    if (Number.isFinite(withZ.getTime())) return withZ
  }
  return null
}

function addOneMonth(d: Date): Date {
  const next = new Date(d.getTime())
  const utcMonth = next.getUTCMonth()
  next.setUTCMonth(utcMonth + 1)
  return next
}

export async function getSubscriptionAccessForUser(userId: string): Promise<SubscriptionAccess> {
  const user = await queryOne<{ plan_id: string | null }>("SELECT plan_id FROM users WHERE id = ? LIMIT 1", [
    userId,
  ])
  const userPlanId = user?.plan_id ?? null

  const sub = await queryOne<{
    id: string
    plan_id: string
    status: string
    current_period_end: Date | string | null
    created_at: Date | string | null
    plan_price: number | null
  }>(
    `SELECT s.id, s.plan_id, s.status, s.current_period_end, s.created_at, p.price AS plan_price
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [userId]
  )

  if (!sub) {
    const restricted = !!userPlanId && userPlanId !== PLAN_IDS.FREE
    return {
      user_plan_id: userPlanId,
      subscription: null,
      restricted,
      reason: restricted ? "missing" : null,
    }
  }

  const startDate = parseDbTimestampToDate(sub.created_at)
  const startIso = startDate ? startDate.toISOString() : null

  let derivedPeriodEnd = false
  let endDate = parseDbTimestampToDate(sub.current_period_end)
  if (!endDate && startDate && sub.plan_price != null && Number(sub.plan_price) > 0) {
    endDate = addOneMonth(startDate)
    derivedPeriodEnd = true
  }
  const endIso = endDate ? endDate.toISOString() : null

  const isExpired = !!endDate && endDate.getTime() <= Date.now()
  const restricted = !!userPlanId && userPlanId !== PLAN_IDS.FREE && isExpired

  return {
    user_plan_id: userPlanId,
    subscription: {
      id: sub.id,
      plan_id: sub.plan_id,
      status: sub.status,
      current_period_start: startIso,
      current_period_end: endIso,
      is_expired: isExpired,
      derived_period_end: derivedPeriodEnd,
    },
    restricted,
    reason: restricted ? "expired" : null,
  }
}
