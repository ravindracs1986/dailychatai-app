import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { getPlanQuotasForUser, getUserUsage, getSubscriptionAccessForUser } from "@/lib/usage"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const usage = await getUserUsage(user.id)
  const plan = await getPlanQuotasForUser(user.id)
  const access = await getSubscriptionAccessForUser(user.id)

  const messages_today = usage.usage_today
  const messages_per_day = plan.messages_per_day
  const messages_remaining_today =
    messages_per_day == null ? null : Math.max(0, Number(messages_per_day) - Number(messages_today))

  return NextResponse.json({
    usage_today: usage.usage_today,
    usage_limit: usage.usage_limit,
    canSend: usage.canSend,

    plan: {
      messages_per_day,
      chat_burst_per_minute: plan.chat_burst_per_minute,
    },
    subscription: access.subscription,
    access: {
      restricted: access.restricted,
      reason: access.reason,
    },
    usage: {
      messages_today,
      messages_remaining_today,
    },
  })
}
