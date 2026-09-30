import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const totalResult = await query("SELECT COUNT(*) as count FROM users") as any[]
    const total = totalResult[0]?.count || 0

    const users = await query(
      `SELECT id, username, email, role, plan_id, usage_limit, usage_today, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    )
    
    return NextResponse.json({ 
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Admin fetch users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
