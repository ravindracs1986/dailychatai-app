import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { queryOne } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"
import { PLAN_IDS } from "@/lib/plans"
import { getSubscriptionAccessForUser } from "@/lib/usage"

/**
 * GET /api/subscriptions/me
 * Returns the current user's active subscription and plan details.
 */
export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ subscription: null, plan: null }, { status: 200 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const access = await getSubscriptionAccessForUser(user.id)
  const targetPlanId = access.subscription?.plan_id || user.plan_id || PLAN_IDS.FREE

  const planDetails = await queryOne<{
    id: string
    name: string
    price: number
    messages_per_day: number
    model: string
    features: string | null
  }>("SELECT * FROM plans WHERE id = ?", [targetPlanId])

  const features =
    planDetails?.features == null
      ? null
      : typeof planDetails.features === "string"
        ? JSON.parse(planDetails.features)
        : planDetails.features

  const fallbackPlan = {
    id: targetPlanId,
    name: "Free",
    price: 0,
    messages_per_day: 10,
    model: "openai/gpt-3.5-turbo",
    features: { support: "community" },
  }

  return NextResponse.json({
    subscription: access.subscription,
    plan: planDetails
      ? {
          id: planDetails.id,
          name: planDetails.name,
          price: planDetails.price,
          messages_per_day: planDetails.messages_per_day,
          model: planDetails.model,
          features,
        }
      : fallbackPlan,
    currentPlanId: targetPlanId,
    access: {
      restricted: access.restricted,
      reason: access.reason,
    },
  })
}
