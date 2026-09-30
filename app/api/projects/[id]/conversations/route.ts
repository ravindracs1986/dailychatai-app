import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get("limit") || "50")
    const offsetRaw = Number(searchParams.get("offset") || "0")
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0
    const q = (searchParams.get("q") || "").trim()
    const hasQuery = q.length > 0
    
    // First verify project belongs to user
    const projects = await query(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?",
      [id, user.id]
    )
    
    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    const where: string[] = ["user_id = ?", "project_id = ?"]
    const paramsList: (string | number)[] = [user.id, id]
    if (hasQuery) {
      where.push("title LIKE ?")
      paramsList.push(`%${q}%`)
    }

    const conversations = await query(
      `SELECT * FROM conversations
       WHERE ${where.join(" AND ")}
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT ? OFFSET ?`,
      [...paramsList, limit, offset]
    )

    return NextResponse.json({ conversations, limit, offset, q })
  } catch (error) {
    console.error("Failed to fetch project conversations:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}
