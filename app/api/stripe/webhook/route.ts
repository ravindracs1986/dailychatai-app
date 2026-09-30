import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { execute, queryOne } from "@/lib/db"
import { generateUUID } from "@/lib/db"
import { PLAN_IDS } from "@/lib/plans"
import { getDefaultLimitForPlanId } from "@/lib/usage"
import { sendInvoiceEmail } from "@/lib/email"

// Initialize Stripe with a fallback key for build time (Next.js static analysis).
// In production runtime, STRIPE_SECRET_KEY must be present or calls will fail.
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_fallback_for_build"
const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    // Handle Checkout Session Completed (for one-time payments)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const { userId, planId, transactionId, billingCycle } = session.metadata || {}

      if (userId && planId) {
          // Update transaction
          if (transactionId) {
              await execute(
                  "UPDATE transactions SET status = 'completed', reference_id = ? WHERE id = ?",
                  [session.id, transactionId]
              )
          }

          // Update Subscription
          const limit = await getDefaultLimitForPlanId(planId)
          const subId = generateUUID()
          
          // Calculate period end
          const now = new Date()
          const periodEnd = new Date(now)
          if (billingCycle === 'annually') {
              periodEnd.setFullYear(now.getFullYear() + 1)
          } else {
              periodEnd.setMonth(now.getMonth() + 1)
          }
          const periodEndStr = periodEnd.toISOString().slice(0, 19).replace("T", " ")

          // Deactivate old active subscriptions
          await execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", [userId])

          // Create new subscription
          await execute(
            `INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_end) 
             VALUES (?, ?, ?, 'active', ?)`,
            [subId, userId, planId, periodEndStr]
          )

          // Update User
          await execute(
            "UPDATE users SET plan_id = ?, usage_limit = ? WHERE id = ?",
            [planId, limit, userId]
          )

          // Send Invoice
          const user = await queryOne<{ email: string, username: string }>("SELECT email, username FROM users WHERE id = ?", [userId])
          const plan = await queryOne<{ name: string, price: number }>("SELECT name, price FROM plans WHERE id = ?", [planId])

          if (user && plan) {
              try {
                  await sendInvoiceEmail(user.email, user.username || "User", {
                      invoiceId: transactionId || session.id,
                      date: new Date(),
                      user: {
                          name: user.username || "Valued Customer",
                          email: user.email
                      },
                      items: [{
                          description: `Subscription to ${plan.name} (${billingCycle})`,
                          amount: session.amount_total ? session.amount_total / 100 : Number(plan.price)
                      }],
                      total: session.amount_total ? session.amount_total / 100 : Number(plan.price),
                      currency: 'USD'
                  })
              } catch (err) {
                  console.error("Failed to send invoice email:", err)
              }
          }
      }
    }

    // Handle Subscription Events (for recurring subscriptions via Stripe Billing)
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const planIdByPriceId: Record<string, string> = {
        [process.env.STRIPE_PRICE_PRO || ""]: PLAN_IDS.PRO,
        [process.env.STRIPE_PRICE_ENTERPRISE || ""]: PLAN_IDS.ENTERPRISE,
      }
      const priceId = sub.items?.data?.[0]?.price?.id
      const planId = planIdByPriceId[priceId || ""] || PLAN_IDS.FREE
      const limit = getDefaultLimitForPlanId(planId)

      let user = await queryOne<{ id: string }>(
        "SELECT user_id AS id FROM subscriptions WHERE stripe_customer_id = ? LIMIT 1",
        [customerId]
      )
      if (!user) {
        const customer = await stripe.customers.retrieve(customerId)
        const userId = (customer as Stripe.Customer).metadata?.userId
        if (userId) user = { id: userId }
      }
      if (user) {
        await execute(
          "UPDATE users SET plan_id = ?, usage_limit = ? WHERE id = ?",
          [planId, limit ?? 10, user.id]
        )
        const subId = generateUUID()
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 19).replace("T", " ")
          : null
        await execute(
          `INSERT INTO subscriptions (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_end)
           VALUES (?, ?, ?, ?, ?, 'active', ?)
           ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), status = 'active', current_period_end = VALUES(current_period_end)`,
          [subId, user.id, planId, sub.id, customerId, periodEnd]
        )
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription
      const row = await queryOne<{ user_id: string }>(
        "SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1",
        [sub.id]
      )
      if (row) {
        await execute("UPDATE users SET plan_id = ?, usage_limit = 10 WHERE id = ?", [
          PLAN_IDS.FREE,
          row.user_id,
        ])
      }
      await execute("UPDATE subscriptions SET status = 'cancelled' WHERE stripe_subscription_id = ?", [
        sub.id,
      ])
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error("[stripe/webhook]", e)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
