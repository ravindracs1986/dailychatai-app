import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query, queryOne, isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const offset = (page - 1) * limit

  try {
    // Get total count
    const countResult = await queryOne<{ total: number }>(`
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN payment_gateways pg ON t.gateway_id = pg.id
      WHERE t.status = 'pending'
    `)
    const total = countResult?.total || 0

    // Get paginated transactions
    const transactions = await query(`
      SELECT 
        t.*, 
        u.email as user_email, 
        u.username as user_name,
        pg.name as gateway_name,
        pg.title as gateway_title
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN payment_gateways pg ON t.gateway_id = pg.id
      WHERE t.status = 'pending'
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset])

    return NextResponse.json({ 
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Admin payments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
