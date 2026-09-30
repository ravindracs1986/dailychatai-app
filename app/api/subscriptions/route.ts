import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, queryOne, generateUUID, isDatabaseConfigured } from "@/lib/db"
import { getDefaultLimitForPlanId } from "@/lib/usage"
import Stripe from "stripe"

const SubscribeSchema = z.object({
  plan_id: z.string().uuid(),
  gateway_id: z.string().optional(),
  billing_cycle: z.enum(["monthly", "annually"]).default("monthly"),
  metadata: z.object({
      reference_id: z.string().optional(),
      proof_url: z.string().optional()
  }).optional()
})

/**
 * POST /api/subscriptions
 * Subscribe the current user to a plan.
 * - Free plans: Immediate upgrade.
 * - Paid plans: Requires payment gateway processing.
 */
export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }
    const { plan_id, gateway_id, billing_cycle, metadata } = parsed.data

    const plan = await queryOne<{ id: string, price: number, name: string }>("SELECT * FROM plans WHERE id = ?", [plan_id])
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // 1. Free plan: Immediate upgrade
    if (plan.price === 0 || plan.name === 'Free') {
        const limit = await getDefaultLimitForPlanId(plan_id)
        const subId = generateUUID()
        
        // Deactivate old active subscriptions
        await execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", [user.id])

        await execute(
          `INSERT INTO subscriptions (id, user_id, plan_id, status) VALUES (?, ?, ?, 'active')`,
          [subId, user.id, plan_id]
        )
        await execute(
          "UPDATE users SET plan_id = ?, usage_limit = ? WHERE id = ?",
          [plan_id, limit, user.id]
        )
        return NextResponse.json({
          subscription: { id: subId, plan_id, status: "active" },
          message: "Subscribed successfully",
        })
    }

    // 2. Paid plan: Payment Gateway Logic
    if (!gateway_id) {
        return NextResponse.json({ error: "Payment method required for paid plans" }, { status: 400 })
    }

    const gateway = await queryOne<{ id: string, name: string, config: any, is_active: number }>(
        "SELECT * FROM payment_gateways WHERE id = ?", 
        [gateway_id]
    )
    
    if (!gateway || !gateway.is_active) {
        return NextResponse.json({ error: "Invalid or inactive payment method" }, { status: 400 })
    }

    // Calculate Amount
    let amount = Number(plan.price)
    if (billing_cycle === "annually") {
        const discount = Number(process.env.SITE_DISCOUNT) || 30
        amount = amount * 12 * (1 - discount / 100)
    }
    amount = Math.round(amount * 100) / 100 // Round to 2 decimals

    // Create Transaction Record
    const txId = generateUUID()
    const txMetadata = {
        plan_id, 
        billing_cycle, 
        plan_name: plan.name,
        ...(metadata || {})
    }
    await execute(
        `INSERT INTO transactions (id, user_id, gateway_id, amount, currency, status, metadata) 
         VALUES (?, ?, ?, ?, 'USD', 'pending', ?)`,
        [txId, user.id, gateway_id, amount, JSON.stringify(txMetadata)]
    )

    // Handle Stripe
    if (gateway.name === 'stripe') {
        let stripeKey = process.env.STRIPE_SECRET_KEY
        let config = gateway.config
        if (typeof config === 'string') {
            try { config = JSON.parse(config) } catch(e) {}
        }
        if (config && config.secret_key) {
            stripeKey = config.secret_key
        }

        if (!stripeKey) {
             return NextResponse.json({ error: "Stripe not configured server-side" }, { status: 500 })
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" })
        
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5005"
        
        // Use ad-hoc pricing for flexibility (one-time payment for the period)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${plan.name} Plan (${billing_cycle})`,
                            description: `Subscription for ${plan.name} plan`,
                        },
                        unit_amount: Math.round(amount * 100), // cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${siteUrl}/usage?payment=success&tx=${txId}`,
            cancel_url: `${siteUrl}/usage?payment=cancelled`,
            metadata: {
                userId: user.id,
                planId: plan_id,
                transactionId: txId,
                billingCycle: billing_cycle
            }
        })
        
        return NextResponse.json({ url: session.url, transactionId: txId })
    }
    
    // Handle Manual
    if (gateway.name === 'manual') {
        return NextResponse.json({ 
            message: "Payment request submitted. Please contact admin.", 
            transactionId: txId,
            status: "pending_approval",
            isManual: true
        })
    }

    // Handle PayPal
    if (gateway.name === 'paypal') {
        let clientId = process.env.PAYPAL_CLIENT_ID
        let clientSecret = process.env.PAYPAL_CLIENT_SECRET
        
        let config = gateway.config
        if (typeof config === 'string') {
            try { config = JSON.parse(config) } catch(e) {}
        }
        if (config) {
            if (config.client_id) clientId = config.client_id
            if (config.client_secret) clientSecret = config.client_secret
        }

        if (!clientId || !clientSecret) {
             // For development/demo without keys, we can simulate if allowed, but better to error
             // or return a specific error that the frontend can handle (e.g. show manual instruction)
             return NextResponse.json({ error: "PayPal not configured server-side" }, { status: 500 })
        }

        const isProduction = config?.mode === 'live' || (process.env.NODE_ENV === "production" && config?.mode !== 'sandbox')
        const baseUrl = isProduction ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"
        
        // 1. Get Access Token
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        
        if (!tokenRes.ok) {
            const err = await tokenRes.text()
            console.error("PayPal Token Error:", err)
            return NextResponse.json({ error: "Failed to connect to PayPal" }, { status: 502 })
        }
        
        const tokenData = await tokenRes.json()
        const accessToken = tokenData.access_token

        // 2. Create Order
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5005"
        
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                    reference_id: txId,
                    amount: {
                        currency_code: "USD",
                        value: amount.toFixed(2),
                    },
                    description: `${plan.name} Plan (${billing_cycle})`,
                }],
                application_context: {
                    return_url: `${siteUrl}/usage?payment=success&tx=${txId}&gateway=paypal`,
                    cancel_url: `${siteUrl}/usage?payment=cancelled`,
                    user_action: "PAY_NOW",
                    brand_name: "Dailychatai AI",
                }
            })
        })
        
        if (!orderRes.ok) {
            const err = await orderRes.text()
            console.error("PayPal Order Error:", err)
            return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 502 })
        }
        
        const orderData = await orderRes.json()
        const approveLink = orderData.links.find((l: any) => l.rel === "approve")?.href
        
        if (!approveLink) {
             return NextResponse.json({ error: "No approval link returned from PayPal" }, { status: 502 })
        }

        // Update transaction with PayPal Order ID
        await execute(
            "UPDATE transactions SET reference_id = ?, metadata = JSON_MERGE_PATCH(metadata, ?) WHERE id = ?",
            [orderData.id, JSON.stringify({ paypal_order_id: orderData.id }), txId]
        )

        return NextResponse.json({ url: approveLink, transactionId: txId })
    }

    return NextResponse.json({ error: "Gateway not supported" }, { status: 501 })

  } catch (e) {
    console.error("[subscriptions POST]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Subscription failed" },
      { status: 500 }
    )
  }
}
