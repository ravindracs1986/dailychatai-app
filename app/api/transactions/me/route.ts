import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query, queryOne, isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ transactions: [], total: 0 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "5")
  const offset = (page - 1) * limit

  try {
    const [transactions, totalResult] = await Promise.all([
      query<any>(
        "SELECT id, amount, currency, status, created_at, metadata FROM transactions WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [user.id, limit, offset]
      ),
      queryOne<{ total: number }>(
        "SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND status = 'completed'",
        [user.id]
      )
    ])

    return NextResponse.json({
      transactions: transactions.map(tx => {
        let planName = "Unknown Plan"
        try {
            const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata
            planName = metadata?.plan_name || planName
        } catch (e) {
            // ignore json parse error
        }
        
        return {
          id: tx.id,
          date: tx.created_at,
          planName: planName,
          amount: tx.amount,
          currency: tx.currency
        }
      }),
      total: totalResult?.total || 0,
      page,
      limit
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
