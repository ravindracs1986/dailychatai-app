import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { isDatabaseConfigured, query } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const currentUser = await getCurrentUser(request)
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const q = (searchParams.get("q") || "").trim()
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20")))
    const offset = (page - 1) * limit

    const where = q ? "WHERE (username LIKE ? OR email LIKE ?)" : ""
    const args = q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]
    const countArgs = q ? [`%${q}%`, `%${q}%`] : []

    const totalResult = (await query(
      `SELECT COUNT(*) AS count FROM users ${where}`,
      countArgs
    )) as any[]
    const total = Number(totalResult?.[0]?.count || 0)

    const users = await query(
      `SELECT id, username, email, role, COALESCE(local_llm_enabled, 0) AS local_llm_enabled
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      args
    )

    return NextResponse.json({
      users,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (e) {
    console.error("[admin][local-llm] list users", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

