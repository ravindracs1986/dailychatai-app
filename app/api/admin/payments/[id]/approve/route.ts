import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, queryOne, generateUUID, isDatabaseConfigured } from "@/lib/db"
import { getDefaultLimitForPlanId } from "@/lib/usage"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const txId = params.id
    const tx = await queryOne<any>("SELECT * FROM transactions WHERE id = ?", [txId])
    
    if (!tx) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    
    if (tx.status !== 'pending') {
        return NextResponse.json({ error: "Transaction is not pending" }, { status: 400 })
    }

    let metadata: any = {}
    try {
        metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata
    } catch(e) {}

    const { plan_id, billing_cycle } = metadata
    
    if (!plan_id) {
        return NextResponse.json({ error: "Invalid transaction metadata" }, { status: 400 })
    }

    // Update Transaction Status
    await execute("UPDATE transactions SET status = 'completed' WHERE id = ?", [txId])

    // Update User Subscription
    const limit = await getDefaultLimitForPlanId(plan_id)
    const subId = generateUUID()
    const cycle = billing_cycle === "annually" ? "annually" : "monthly"
    const periodEnd = new Date()
    if (cycle === "annually") {
      periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1)
    } else {
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
    }
    
    // Deactivate old active subscriptions
    await execute("UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'", [tx.user_id])

    await execute(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_end) VALUES (?, ?, ?, 'active', ?)`,
      [subId, tx.user_id, plan_id, periodEnd]
    )
    
    await execute(
      "UPDATE users SET plan_id = ?, usage_limit = ? WHERE id = ?",
      [plan_id, limit, tx.user_id]
    )

    // Send Invoice
    const userDetails = await queryOne<{ email: string, username: string }>("SELECT email, username FROM users WHERE id = ?", [tx.user_id])
    const planDetails = await queryOne<{ name: string, price: number }>("SELECT name, price FROM plans WHERE id = ?", [plan_id])

    if (userDetails && planDetails) {
         // Send email in background to avoid blocking response
         sendInvoiceEmail(userDetails.email, userDetails.username || "User", {
            invoiceId: txId,
            date: new Date(),
            user: {
                name: userDetails.username || "Valued Customer",
                email: userDetails.email
            },
            items: [{
                description: `Subscription to ${planDetails.name} (${billing_cycle})`,
                amount: Number(tx.amount)
            }],
            subTotal: Number(tx.amount),
            total: Number(tx.amount),
            amountDue: Number(tx.amount),
            currency: tx.currency || 'USD'
        }).catch(err => {
             console.error("Failed to send invoice email:", err)
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin approve payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
