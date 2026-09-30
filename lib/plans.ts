/**
 * Subscription plan IDs (must match migrations/002_seed_plans.sql)
 */
export const PLAN_IDS = {
  FREE: "00000000-0000-0000-0000-000000000001",
  PRO: "00000000-0000-0000-0000-000000000002",
  ENTERPRISE: "00000000-0000-0000-0000-000000000003",
} as const

export type PlanSlug = "free" | "pro" | "enterprise"

export const PLAN_SLUG_BY_ID: Record<string, PlanSlug> = {
  [PLAN_IDS.FREE]: "free",
  [PLAN_IDS.PRO]: "pro",
  [PLAN_IDS.ENTERPRISE]: "enterprise",
}

export interface Plan {
  id: string
  name: string
  price: number | null
  messages_per_day: number | null
  model: string | null
  features: Record<string, unknown> | null
}
