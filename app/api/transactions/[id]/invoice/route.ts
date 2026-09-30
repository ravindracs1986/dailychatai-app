import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { queryOne, isDatabaseConfigured } from "@/lib/db"
import { generateInvoicePdf, InvoiceData } from "@/lib/invoice"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const transactionId = params.id

  try {
    // Fetch transaction
    const transaction = await queryOne<any>(
      "SELECT * FROM transactions WHERE id = ? AND user_id = ? AND status = 'completed'",
      [transactionId, user.id]
    )

    if (!transaction) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Parse metadata for extra details
    let metadata: any = {}
    try {
        metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata
    } catch (e) {}

    // Prepare Invoice Data
    const amount = Number(transaction.amount)
    const currency = transaction.currency || 'USD'
    const date = new Date(transaction.created_at)
    const dueDate = new Date(date)
    dueDate.setDate(dueDate.getDate() + 1) // Due next day or same day? Image says "On Receipt" so maybe same day or close.

    // Determine items based on plan name in metadata or generic
    const planName = metadata.plan_name || 'Subscription'
    const billingCycle = metadata.billing_cycle || 'monthly'
    
    // Check for discount (implied if amount is less than plan price, but we just use transaction amount)
    // If we want to show discount explicitly, we'd need original price. 
    // For now, we'll just show the final amount as the item amount.
    // If metadata has discount info, use it.
    
    const invoiceData: InvoiceData = {
      invoiceId: transaction.id.substring(0, 8).toUpperCase(), // Short ID for display? Or full ID.
      date: date,
      dueDate: dueDate,
      user: {
        name: user.name || user.email.split('@')[0], // Fallback name
        email: user.email,
        address: [user.address, user.city, user.state, user.country].filter(Boolean).join(', ') || '', 
        phone: user.phone || ''
      },
      items: [
        {
          description: `${planName} - ${billingCycle} subscription`,
          amount: amount,
          quantity: 1,
          price: amount
        }
      ],
      subTotal: amount,
      total: amount,
      amountDue: amount,
      currency: currency,
      // discount: 0 // Add logic if we track discounts
    }

    const pdfBuffer = await generateInvoicePdf(invoiceData)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${transaction.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
